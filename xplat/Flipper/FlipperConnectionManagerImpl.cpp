/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "FlipperConnectionManagerImpl.h"
#include <folly/String.h>
#include <folly/json.h>
#include <stdexcept>
#include <thread>
#include "ConnectionContextStore.h"
#include "FireAndForgetBasedFlipperResponder.h"
#include "FlipperExceptions.h"
#include "FlipperSocketProvider.h"
#include "FlipperStep.h"
#include "Log.h"

#define WRONG_THREAD_EXIT_MSG \
  "ERROR: Aborting flipper initialization because it's not running in the flipper thread."

static constexpr int reconnectIntervalSeconds = 2;

// Not a public-facing version number.
// Used for compatibility checking with desktop flipper.
// To be bumped for every core platform interface change.
static constexpr int sdkVersion = 4;

using namespace folly;

namespace facebook {
namespace flipper {

class FlipperConnectionManagerWrapper {
 public:
  FlipperConnectionManagerWrapper(FlipperConnectionManagerImpl* impl)
      : impl_(impl) {}
  FlipperConnectionManagerImpl* get_impl() {
    return impl_;
  }

 private:
  FlipperConnectionManagerImpl* impl_;
};
class ConnectionEvents {
 public:
  ConnectionEvents(std::weak_ptr<FlipperConnectionManagerWrapper> impl)
      : impl_(impl) {}
  void operator()(const SocketEvent event) {
    if (auto w = impl_.lock()) {
      FlipperConnectionManagerImpl* impl = w->get_impl();
      if (impl == nullptr) {
        return;
      }
      impl->handleSocketEvent(event);
    }
  }

 private:
  std::weak_ptr<FlipperConnectionManagerWrapper> impl_;
};

FlipperConnectionManagerImpl::FlipperConnectionManagerImpl(
    FlipperInitConfig config,
    std::shared_ptr<FlipperState> state,
    std::shared_ptr<ConnectionContextStore> contextStore)
    : deviceData_(config.deviceData),
      flipperState_(state),
      insecurePort(config.insecurePort),
      securePort(config.securePort),
      altInsecurePort(config.altInsecurePort),
      altSecurePort(config.altSecurePort),
      flipperScheduler_(config.callbackWorker),
      connectionScheduler_(config.connectionWorker),
      contextStore_(contextStore),
      implWrapper_(std::make_shared<FlipperConnectionManagerWrapper>(this)) {
  CHECK_THROW(config.callbackWorker, std::invalid_argument);
  CHECK_THROW(config.connectionWorker, std::invalid_argument);
}

FlipperConnectionManagerImpl::~FlipperConnectionManagerImpl() {
  stop();
}

void FlipperConnectionManagerImpl::setCertificateProvider(
    const std::shared_ptr<FlipperCertificateProvider> provider) {
  certProvider_ = provider;
};

std::shared_ptr<FlipperCertificateProvider>
FlipperConnectionManagerImpl::getCertificateProvider() {
  return certProvider_;
}

void FlipperConnectionManagerImpl::handleSocketEvent(SocketEvent event) {
  switch (event) {
    case SocketEvent::OPEN:
      isConnected_ = true;
      if (connectionIsTrusted_) {
        callbacks_->onConnected();
      }
      break;
    case SocketEvent::SSL_ERROR:
      // SSL errors are not handled as a connection event
      // on this handler.
      break;
    case SocketEvent::CLOSE:
    case SocketEvent::ERROR:
      if (!isConnected_) {
        return;
      }
      isConnected_ = false;
      if (connectionIsTrusted_) {
        connectionIsTrusted_ = false;
        callbacks_->onDisconnected();
      }
      reconnect();
      break;
  }
}

void FlipperConnectionManagerImpl::start() {
  if (!FlipperSocketProvider::hasProvider()) {
    log("No socket provider has been set, unable to start");
    return;
  }

  if (isStarted_) {
    log("Already started");
    return;
  }
  isStarted_ = true;

  auto step = flipperState_->start("Start connection thread");

  flipperScheduler_->schedule([this, step]() {
    step->complete();
    startSync();
  });
}

void FlipperConnectionManagerImpl::startSync() {
  if (!isStarted_) {
    log("Not started");
    return;
  }
  if (!isRunningInOwnThread()) {
    log(WRONG_THREAD_EXIT_MSG);
    return;
  }
  if (isConnected()) {
    log("Already connected");
    return;
  }
  bool isClientSetupStep = isCertificateExchangeNeeded();
  auto step = flipperState_->start(
      isClientSetupStep ? "Establish pre-setup connection"
                        : "Establish main connection");
  try {
    if (isClientSetupStep) {
      bool success = connectAndExchangeCertificate();
      if (!success) {
        reconnect();
        return;
      }
    } else {
      if (!connectSecurely()) {
        // The expected code path when flipper desktop is not running.
        // Don't count as a failed attempt, or it would invalidate the
        // connection files for no reason. On iOS devices, we can always connect
        // to the local port forwarding server even when it can't connect to
        // flipper. In that case we get a Network error instead of a Port not
        // open error, so we treat them the same.
        step->fail(
            "No route to flipper found. Is flipper desktop running? Retrying...");
        reconnect();
      }
    }
    step->complete();
  } catch (const SSLException& e) {
    auto message = std::string(e.what()) +
        "\nMake sure the date and time of your device is up to date.";
    log(message);
    step->fail(message);
    failedConnectionAttempts_++;
    reconnect();
  } catch (const std::exception& e) {
    log(e.what());
    step->fail(e.what());
    failedConnectionAttempts_++;
    reconnect();
  }
}

bool FlipperConnectionManagerImpl::connectAndExchangeCertificate() {
  auto port = insecurePort;
  auto endpoint = FlipperConnectionEndpoint(deviceData_.host, port, false);

  int medium = certProvider_ != nullptr
      ? certProvider_->getCertificateExchangeMedium()
      : FlipperCertificateExchangeMedium::FS_ACCESS;

  auto payload = std::make_unique<FlipperSocketBasePayload>();
  payload->os = deviceData_.os;
  payload->device = deviceData_.device;
  payload->device_id = "unknown";
  payload->app = deviceData_.app;
  payload->sdk_version = sdkVersion;
  payload->medium = medium;

  client_ = FlipperSocketProvider::socketCreate(
      endpoint, std::move(payload), flipperScheduler_);
  client_->setEventHandler(ConnectionEvents(implWrapper_));

  auto connectingInsecurely = flipperState_->start("Connect insecurely");
  connectionIsTrusted_ = false;

  // Connect is just handled here, move this elsewhere.
  if (!client_->connect(this)) {
    connectingInsecurely->fail("Failed to connect");
    client_ = nullptr;
    return false;
  }

  connectingInsecurely->complete();

  auto resettingState = flipperState_->start("Reset state");
  contextStore_->resetState();
  resettingState->complete();

  requestSignedCertificate();
  return true;
}

bool FlipperConnectionManagerImpl::connectSecurely() {
  client_ = nullptr;

  auto port = securePort;
  auto endpoint = FlipperConnectionEndpoint(deviceData_.host, port, true);

  int medium = certProvider_ != nullptr
      ? certProvider_->getCertificateExchangeMedium()
      : FlipperCertificateExchangeMedium::FS_ACCESS;

  auto loadingDeviceId = flipperState_->start("Load Device Id");
  auto deviceId = contextStore_->getDeviceId();
  if (deviceId.compare("unknown")) {
    loadingDeviceId->complete();
  }

  auto payload = std::make_unique<FlipperSocketSecurePayload>();
  payload->os = deviceData_.os;
  payload->device = deviceData_.device;
  payload->device_id = deviceId;
  payload->app = deviceData_.app;
  payload->sdk_version = sdkVersion;
  payload->medium = medium;
  payload->csr = contextStore_->getCertificateSigningRequest().c_str();
  payload->csr_path = contextStore_->getCertificateDirectoryPath().c_str();

  client_ = FlipperSocketProvider::socketCreate(
      endpoint, std::move(payload), connectionScheduler_, contextStore_.get());
  client_->setEventHandler(ConnectionEvents(implWrapper_));
  client_->setMessageHandler([this](const std::string& msg) {
    std::unique_ptr<FireAndForgetBasedFlipperResponder> responder;
    auto message = folly::parseJson(msg);
    auto idItr = message.find("id");
    if (idItr == message.items().end()) {
      responder = std::make_unique<FireAndForgetBasedFlipperResponder>(this);
    } else {
      responder = std::make_unique<FireAndForgetBasedFlipperResponder>(
          this, idItr->second.getInt());
    }

    this->onMessageReceived(folly::parseJson(msg), std::move(responder));
  });

  auto connectingSecurely = flipperState_->start("Connect securely");
  connectionIsTrusted_ = true;

  // Connect is just handled here, move this elsewhere.
  if (!client_->connect(this)) {
    connectingSecurely->fail("Failed to connect");
    client_ = nullptr;
    return false;
  }

  connectingSecurely->complete();
  failedConnectionAttempts_ = 0;
  return true;
}

void FlipperConnectionManagerImpl::reconnect() {
  if (!isStarted_) {
    log("Not started");
    return;
  }
  flipperScheduler_->scheduleAfter(
      [this]() { startSync(); }, reconnectIntervalSeconds * 1000.0f);
}

void FlipperConnectionManagerImpl::stop() {
  if (certProvider_ && certProvider_->shouldResetCertificateFolder()) {
    contextStore_->resetState();
  }
  if (!isStarted_) {
    log("Not started");
    return;
  }
  isStarted_ = false;

  std::shared_ptr<std::promise<void>> joinPromise =
      std::make_shared<std::promise<void>>();
  std::future<void> join = joinPromise->get_future();
  flipperScheduler_->schedule([this, joinPromise]() {
    if (client_) {
      client_->disconnect();
    }
    client_ = nullptr;
    joinPromise->set_value();
  });

  join.wait();
}

bool FlipperConnectionManagerImpl::isConnected() const {
  return isConnected_ && connectionIsTrusted_;
}

void FlipperConnectionManagerImpl::setCallbacks(Callbacks* callbacks) {
  callbacks_ = callbacks;
}

void FlipperConnectionManagerImpl::sendMessage(const folly::dynamic& message) {
  flipperScheduler_->schedule([this, message]() {
    try {
      if (client_) {
        client_->send(message, []() {});
      }
    } catch (std::length_error& e) {
      // Skip sending messages that are too large.
      log(e.what());
      return;
    }
  });
}

void FlipperConnectionManagerImpl::sendMessageRaw(const std::string& message) {
  flipperScheduler_->schedule([this, message]() {
    try {
      if (client_) {
        client_->send(message, []() {});
      }
    } catch (std::length_error& e) {
      // Skip sending messages that are too large.
      log(e.what());
      return;
    }
  });
}

void FlipperConnectionManagerImpl::onMessageReceived(
    const folly::dynamic& message,
    std::unique_ptr<FlipperResponder> responder) {
  callbacks_->onMessageReceived(message, std::move(responder));
}

bool FlipperConnectionManagerImpl::isCertificateExchangeNeeded() {
  if (failedConnectionAttempts_ >= 2) {
    return true;
  }

  auto last_known_medium = contextStore_->getLastKnownMedium();
  if (!last_known_medium) {
    return true;
  }

  // When we exchange certs over WWW, we use a fake generated serial number and
  // a virtual device. If medium changes to FS_ACCESS at some point, we should
  // restart the exchange process to get the device ID of the real device.
  int medium = certProvider_ != nullptr
      ? certProvider_->getCertificateExchangeMedium()
      : FlipperCertificateExchangeMedium::FS_ACCESS;
  if (last_known_medium != medium) {
    return true;
  }

  auto step = flipperState_->start("Check required certificates are present");
  bool hasRequiredFiles = contextStore_->hasRequiredFiles();
  if (hasRequiredFiles) {
    step->complete();
  }
  return !hasRequiredFiles;
}

void FlipperConnectionManagerImpl::processSignedCertificateResponse(
    std::shared_ptr<FlipperStep> gettingCert,
    std::string response,
    bool isError) {
  /**
     Need to keep track of whether the response has been
     handled. On success, the completion handler deallocates the socket which in
     turn triggers a disconnect. A disconnect is called within
     the context of a subscription handler. This means that the completion
     handler can be called again to notify that the stream has
     been interrupted because we are effectively still handing the response
     read. So, if already handled, ignore and return;
  */
  if (certificateExchangeCompleted_)
    return;
  certificateExchangeCompleted_ = true;
  if (isError) {
    auto error =
        "Desktop failed to provide certificates. Error from flipper desktop:\n" +
        response;
    log(error);
    gettingCert->fail(error);
    client_ = nullptr;
    return;
  }
  int medium = certProvider_ != nullptr
      ? certProvider_->getCertificateExchangeMedium()
      : FlipperCertificateExchangeMedium::FS_ACCESS;

  if (!response.empty()) {
    folly::dynamic config = folly::parseJson(response);
    config["medium"] = medium;
    contextStore_->storeConnectionConfig(config);
  }
  if (certProvider_) {
    certProvider_->setFlipperState(flipperState_);
    auto gettingCertFromProvider =
        flipperState_->start("Getting cert from Cert Provider");

    try {
      // Certificates should be present in app's sandbox after it is
      // returned. The reason we can't have a completion block here
      // is because if the certs are not present after it returns
      // then the flipper tries to reconnect on insecured channel
      // and recreates the app.csr. By the time completion block is
      // called the DeviceCA cert doesn't match app's csr and it
      // throws an SSL error.
      certProvider_->getCertificates(
          contextStore_->getCertificateDirectoryPath(),
          contextStore_->getDeviceId());
      gettingCertFromProvider->complete();
    } catch (std::exception& e) {
      gettingCertFromProvider->fail(e.what());
      gettingCert->fail(e.what());
    } catch (...) {
      gettingCertFromProvider->fail("Exception from certProvider");
      gettingCert->fail("Exception from certProvider");
    }
  }
  log("Certificate exchange complete.");
  gettingCert->complete();

  // Disconnect after message sending is complete.
  // The client destructor will send a disconnected event
  // which will be handled by Flipper which will initiate
  // a reconnect sequence.
  client_ = nullptr;
}

void FlipperConnectionManagerImpl::requestSignedCertificate() {
  auto generatingCSR = flipperState_->start("Generate CSR");
  std::string csr = contextStore_->getCertificateSigningRequest();
  generatingCSR->complete();

  int medium = certProvider_ != nullptr
      ? certProvider_->getCertificateExchangeMedium()
      : FlipperCertificateExchangeMedium::FS_ACCESS;
  folly::dynamic message = folly::dynamic::object("method", "signCertificate")(
      "csr", csr.c_str())(
      "destination",
      contextStore_->getCertificateDirectoryPath().c_str())("medium", medium);

  auto gettingCert = flipperState_->start("Getting cert from desktop");

  certificateExchangeCompleted_ = false;
  flipperScheduler_->schedule([this, message, gettingCert]() {
    if (!client_) {
      return;
    }
    client_->sendExpectResponse(
        folly::toJson(message),
        [this, gettingCert](const std::string& response, bool isError) {
          flipperScheduler_->schedule([this, gettingCert, response, isError]() {
            this->processSignedCertificateResponse(
                gettingCert, response, isError);
          });
        });
  });
  failedConnectionAttempts_ = 0;
}

bool FlipperConnectionManagerImpl::isRunningInOwnThread() {
  return flipperScheduler_->isRunningInOwnThread();
}

} // namespace flipper
} // namespace facebook
