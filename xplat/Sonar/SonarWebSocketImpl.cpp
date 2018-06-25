/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

#include "SonarWebSocketImpl.h"
#include <folly/String.h>
#include <folly/futures/Future.h>
#include <folly/io/async/SSLContext.h>
#include <folly/json.h>
#include <rsocket/Payload.h>
#include <rsocket/RSocket.h>
#include <rsocket/transports/tcp/TcpConnectionFactory.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <fstream>
#include <iostream>
#include <thread>
#include "CertificateUtils.h"

#ifdef __ANDROID__
#include <android/log.h>
#define SONAR_LOG(message) \
  __android_log_print(ANDROID_LOG_INFO, "sonar", "sonar: %s", message)
#else
#define SONAR_LOG(message) printf("sonar: %s\n", message)
#endif

#define CSR_FILE_NAME "app.csr"
#define SONAR_CA_FILE_NAME "sonarCA.crt"
#define CLIENT_CERT_FILE_NAME "device.crt"
#define PRIVATE_KEY_FILE "privateKey.pem"

static constexpr int reconnectIntervalSeconds = 2;
static constexpr int connectionKeepaliveSeconds = 10;
static constexpr int securePort = 8088;
static constexpr int insecurePort = 8089;

namespace facebook {
namespace sonar {

bool fileExists(std::string fileName);

class ConnectionEvents : public rsocket::RSocketConnectionEvents {
 private:
  SonarWebSocketImpl* websocket_;

 public:
  ConnectionEvents(SonarWebSocketImpl* websocket) : websocket_(websocket) {}

  void onConnected() {
    websocket_->isOpen_ = true;
    if (websocket_->connectionIsTrusted_) {
      websocket_->callbacks_->onConnected();
    }
  }

  void onDisconnected(const folly::exception_wrapper&) {
    if (!websocket_->isOpen_)
      return;
    websocket_->isOpen_ = false;
    websocket_->connectionIsTrusted_ = false;
    if (websocket_->connectionIsTrusted_) {
      websocket_->callbacks_->onDisconnected();
    }
    websocket_->reconnect();
  }

  void onClosed(const folly::exception_wrapper& e) {
    onDisconnected(e);
  }
};

class Responder : public rsocket::RSocketResponder {
 private:
  SonarWebSocketImpl* websocket_;

 public:
  Responder(SonarWebSocketImpl* websocket) : websocket_(websocket) {}

  void handleFireAndForget(
      rsocket::Payload request,
      rsocket::StreamId streamId) {
    const auto payload = request.moveDataToString();
    websocket_->callbacks_->onMessageReceived(folly::parseJson(payload));
  }
};

SonarWebSocketImpl::SonarWebSocketImpl(SonarInitConfig config)
    : deviceData_(config.deviceData), worker_(config.worker) {}

SonarWebSocketImpl::~SonarWebSocketImpl() {
  stop();
}

void SonarWebSocketImpl::start() {
  folly::makeFuture()
      .via(worker_->getEventBase())
      .delayedUnsafe(std::chrono::milliseconds(0))
      .then([this]() { startSync(); });
}

void SonarWebSocketImpl::startSync() {
  if (isOpen()) {
    SONAR_LOG("Already connected");
    return;
  }
  try {
    if (isCertificateExchangeNeeded()) {
      doCertificateExchange();
      return;
    }

    connectSecurely();
  } catch (const std::exception&) {
    failedConnectionAttempts_++;
    reconnect();
  }
}

void SonarWebSocketImpl::doCertificateExchange() {

  rsocket::SetupParameters parameters;
  folly::SocketAddress address;

  parameters.payload = rsocket::Payload(
      folly::toJson(folly::dynamic::object("os", deviceData_.os)(
          "device", deviceData_.device)("app", deviceData_.app)));
  address.setFromHostPort(deviceData_.host, insecurePort);

  connectionIsTrusted_ = false;
  client_ =
      rsocket::RSocket::createConnectedClient(
          std::make_unique<rsocket::TcpConnectionFactory>(
              *worker_->getEventBase(), std::move(address)),
          std::move(parameters),
          nullptr,
          std::chrono::seconds(connectionKeepaliveSeconds), // keepaliveInterval
          nullptr, // stats
          std::make_shared<ConnectionEvents>(this))
          .get();

  ensureSonarDirExists();
  requestSignedCertFromSonar();
}

void SonarWebSocketImpl::connectSecurely() {
  rsocket::SetupParameters parameters;
  folly::SocketAddress address;
  parameters.payload = rsocket::Payload(folly::toJson(folly::dynamic::object(
      "os", deviceData_.os)("device", deviceData_.device)(
      "device_id", deviceData_.deviceId)("app", deviceData_.app)));
  address.setFromHostPort(deviceData_.host, securePort);

  std::shared_ptr<folly::SSLContext> sslContext =
      std::make_shared<folly::SSLContext>();
  sslContext->loadTrustedCertificates(
      absoluteFilePath(SONAR_CA_FILE_NAME).c_str());
  sslContext->setVerificationOption(
      folly::SSLContext::SSLVerifyPeerEnum::VERIFY);
  sslContext->loadCertKeyPairFromFiles(
      absoluteFilePath(CLIENT_CERT_FILE_NAME).c_str(),
      absoluteFilePath(PRIVATE_KEY_FILE).c_str());
  sslContext->authenticate(true, false);

  connectionIsTrusted_ = true;
  client_ =
      rsocket::RSocket::createConnectedClient(
          std::make_unique<rsocket::TcpConnectionFactory>(
              *worker_->getEventBase(),
              std::move(address),
              std::move(sslContext)),
          std::move(parameters),
          std::make_shared<Responder>(this),
          std::chrono::seconds(connectionKeepaliveSeconds), // keepaliveInterval
          nullptr, // stats
          std::make_shared<ConnectionEvents>(this))
          .get();
  failedConnectionAttempts_ = 0;
}

void SonarWebSocketImpl::reconnect() {
  folly::makeFuture()
      .via(worker_->getEventBase())
      .delayedUnsafe(std::chrono::seconds(reconnectIntervalSeconds))
      .then([this]() { startSync(); });
}

void SonarWebSocketImpl::stop() {
  client_->disconnect();
  client_ = nullptr;
}

bool SonarWebSocketImpl::isOpen() const {
  return isOpen_ && connectionIsTrusted_;
}

void SonarWebSocketImpl::setCallbacks(Callbacks* callbacks) {
  callbacks_ = callbacks;
}

void SonarWebSocketImpl::sendMessage(const folly::dynamic& message) {
  worker_->add([this, message]() {
    if (client_) {
      client_->getRequester()
          ->fireAndForget(rsocket::Payload(folly::toJson(message)))
          ->subscribe([]() {});
    }
  });
}

bool SonarWebSocketImpl::isCertificateExchangeNeeded() {
  if (failedConnectionAttempts_ >= 2) {
    return true;
  }

  std::string caCert = loadStringFromFile(absoluteFilePath(SONAR_CA_FILE_NAME));
  std::string clientCert =
      loadStringFromFile(absoluteFilePath(CLIENT_CERT_FILE_NAME));
  std::string privateKey =
      loadStringFromFile(absoluteFilePath(PRIVATE_KEY_FILE));

  if (caCert == "" || clientCert == "" || privateKey == "") {
    return true;
  }

  return false;
}

void SonarWebSocketImpl::requestSignedCertFromSonar() {
  generateCertSigningRequest(
      deviceData_.appId.c_str(),
      absoluteFilePath(CSR_FILE_NAME).c_str(),
      absoluteFilePath(PRIVATE_KEY_FILE).c_str());
  std::string csr = loadStringFromFile(absoluteFilePath(CSR_FILE_NAME));

  folly::dynamic message = folly::dynamic::object("method", "signCertificate")(
      "csr", csr.c_str())("destination", absoluteFilePath("").c_str());
  worker_->add([this, message]() {
    client_->getRequester()
        ->fireAndForget(rsocket::Payload(folly::toJson(message)))
        ->subscribe([this]() {
          // Disconnect after message sending is complete.
          // This will trigger a reconnect which should use the secure channel.
          client_ = nullptr;
        });
  });
  failedConnectionAttempts_ = 0;
}

std::string SonarWebSocketImpl::loadStringFromFile(std::string fileName) {
  if (!fileExists(fileName)) {
    return "";
  }
  std::stringstream buffer;
  std::ifstream stream;
  std::string line;
  stream.open(fileName.c_str());
  if (!stream) {
    SONAR_LOG(
        std::string("ERROR: Unable to open ifstream: " + fileName).c_str());
    return "";
  }
  buffer << stream.rdbuf();
  std::string s = buffer.str();
  return s;
}

std::string SonarWebSocketImpl::absoluteFilePath(const char* filename) {
  return std::string(deviceData_.privateAppDirectory + "/sonar/" + filename);
}

bool SonarWebSocketImpl::ensureSonarDirExists() {
  std::string dirPath = absoluteFilePath("");
  struct stat info;
  if (stat(dirPath.c_str(), &info) != 0) {
    int ret = mkdir(dirPath.c_str(), S_IRUSR | S_IWUSR | S_IXUSR);
    return ret == 0;
  } else if (info.st_mode & S_IFDIR) {
    return true;
  } else {
    SONAR_LOG(std::string(
                  "ERROR: Sonar path exists but is not a directory: " + dirPath)
                  .c_str());
    return false;
  }
}

bool fileExists(std::string fileName) {
  struct stat buffer;
  return stat(fileName.c_str(), &buffer) == 0;
}

} // namespace sonar
} // namespace facebook
