/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "FlipperConnectionManagerImpl.h"
#include <folly/DynamicConverter.h>
#include <folly/String.h>
#include <folly/json.h>
#include <stdexcept>
#include <thread>
#include "ConnectionContextStore.h"
#include "FireAndForgetBasedFlipperResponder.h"
#include "FlipperExceptions.h"
#include "FlipperLogger.h"
#include "FlipperSocketProvider.h"
#include "FlipperStep.h"
#include "Log.h"

#define WRONG_THREAD_EXIT_MSG \
  "ERROR: Aborting flipper initialization because it's not running in the flipper thread."

static constexpr int RECONNECT_INTERVAL_SECONDS = 3;

// Not a public-facing version number.
// Used for compatibility checking with desktop flipper.
// To be bumped for every core platform interface change.
static constexpr int SDK_VERSION = 4;

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
      state_(state),
      insecurePort(config.insecurePort),
      securePort(config.securePort),
      altInsecurePort(config.altInsecurePort),
      altSecurePort(config.altSecurePort),
      scheduler_(config.callbackWorker),
      connectionScheduler_(config.connectionWorker),
      store_(contextStore),
      implWrapper_(std::make_shared<FlipperConnectionManagerWrapper>(this)) {
  CHECK_THROW(config.callbackWorker, std::invalid_argument);
  CHECK_THROW(config.connectionWorker, std::invalid_argument);
}

FlipperConnectionManagerImpl::~FlipperConnectionManagerImpl() {
  stop();
}

void FlipperConnectionManagerImpl::setCertificateProvider(
    const std::shared_ptr<FlipperCertificateProvider> provider) {
  log_debug(LogLevel::Info, "[conn] Set certificate provider");
  certificateProvider_ = provider;
};

void FlipperConnectionManagerImpl::setBackupCertificateProvider(
    const std::shared_ptr<FlipperCertificateProvider> provider) {
  log_debug(LogLevel::Info, "[conn] Set backup certificate provider");
  backupCertificateProvider_ = provider;
}

std::shared_ptr<FlipperCertificateProvider>
FlipperConnectionManagerImpl::getCertificateProvider() {
  return certificateProvider_;
}

void FlipperConnectionManagerImpl::handleSocketEvent(SocketEvent event) {
  // Ensure that the event is handled on the correct thread i.e. scheduler.
  scheduler_->schedule([this, event]() {
    switch (event) {
      case SocketEvent::OPEN:
        log_debug(LogLevel::Info, "[conn] Socket event: open");
        isConnected_ = true;
        if (isConnectionTrusted_) {
          failedConnectionAttempts_ = 0;
          callbacks_->onConnected();
        } else {
          requestSignedCertificate();
        }
        break;
      case SocketEvent::SSL_ERROR:
        log_debug(LogLevel::Error, "[conn] Socket event: SSL error");
        failedConnectionAttempts_++;
        reconnect();
        break;
      case SocketEvent::CLOSE:
      case SocketEvent::ERROR:
        if (event == SocketEvent::ERROR) {
          log_debug(LogLevel::Error, "[conn] Socket event: error");
        } else {
          log_debug(LogLevel::Info, "[conn] Socket event: close");
        }

        if (!isConnected_) {
          reconnect();
          return;
        }

        isConnected_ = false;

        if (isConnectionTrusted_) {
          isConnectionTrusted_ = false;
          callbacks_->onDisconnected();
        }

        reconnect();
        break;
    }
  });
}

void FlipperConnectionManagerImpl::start() {
  log_debug(LogLevel::Info, "[conn] Start");

  if (!FlipperSocketProvider::hasProvider()) {
    log("[conn] No socket provider has been set, unable to start");
    return;
  }

  if (started_) {
    log("[conn] Already started");
    return;
  }
  started_ = true;

  auto step = state_->start("Start connection thread");

  scheduler_->schedule([this, step]() {
    step->complete();
    startSync();
  });
}

void FlipperConnectionManagerImpl::startSync() {
  log_debug(LogLevel::Info, "[conn] Start sync");

  if (!started_) {
    log("[conn] Not started");
    return;
  }
  if (!isRunningInOwnThread()) {
    log(WRONG_THREAD_EXIT_MSG);
    return;
  }
  if (isConnected()) {
    log("[conn] Already connected");
    return;
  }

  socket_ = nullptr;

  bool isClientSetupStep = isCertificateExchangeNeeded();
  auto step = state_->start(
      isClientSetupStep ? "Establish certificate exchange connection"
                        : "Establish main connection");
  if (isClientSetupStep) {
    connectAndExchangeCertificate();
  } else {
    connectSecurely();
  }
  step->complete();
}

void FlipperConnectionManagerImpl::connectAndExchangeCertificate() {
  log_debug(LogLevel::Info, "[conn] Connect and exchange certificate");
  auto port = insecurePort;
  auto endpoint = FlipperConnectionEndpoint(deviceData_.host, port, false);

  int medium = certificateProvider_ != nullptr
      ? certificateProvider_->getCertificateExchangeMedium()
      : FlipperCertificateExchangeMedium::FS_ACCESS;

  auto payload = std::make_unique<FlipperSocketBasePayload>();
  payload->os = deviceData_.os;
  payload->device = deviceData_.device;
  payload->device_id = "unknown";
  payload->app = deviceData_.app;
  payload->sdk_version = SDK_VERSION;
  payload->medium = medium;

  socket_ = FlipperSocketProvider::socketCreate(
      endpoint, std::move(payload), scheduler_);
  socket_->setEventHandler(ConnectionEvents(implWrapper_));

  isConnectionTrusted_ = false;

  auto step = state_->start("Attempt to connect for certificate exchange");
  step->complete();

  socket_->connect(this);
}

void FlipperConnectionManagerImpl::connectSecurely() {
  log_debug(LogLevel::Info, "[conn] Connect securely");
  auto port = securePort;
  auto endpoint = FlipperConnectionEndpoint(deviceData_.host, port, true);

  int medium = certificateProvider_ != nullptr
      ? certificateProvider_->getCertificateExchangeMedium()
      : FlipperCertificateExchangeMedium::FS_ACCESS;

  auto loadingDeviceId = state_->start("Load Device Id");
  auto deviceId = store_->getDeviceId();
  if (deviceId.compare("unknown")) {
    loadingDeviceId->complete();
  }

  auto payload = std::make_unique<FlipperSocketSecurePayload>();
  payload->os = deviceData_.os;
  payload->device = deviceData_.device;
  payload->device_id = deviceId;
  payload->app = deviceData_.app;
  payload->sdk_version = SDK_VERSION;
  payload->medium = medium;
  payload->csr = store_->getCertificateSigningRequest().c_str();
  payload->csr_path = store_->getCertificateDirectoryPath().c_str();

  socket_ = FlipperSocketProvider::socketCreate(
      endpoint, std::move(payload), connectionScheduler_, store_.get());
  socket_->setEventHandler(ConnectionEvents(implWrapper_));
  socket_->setMessageHandler([this](const std::string& msg) {
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

  isConnectionTrusted_ = true;

  auto step =
      state_->start("Attempt to connect with existing client certificate");
  step->complete();

  socket_->connect(this);
}

void FlipperConnectionManagerImpl::reconnect() {
  log_debug(LogLevel::Info, "[conn] Reconnect");
  if (!started_) {
    log("[conn] Not started");
    return;
  }
  scheduler_->scheduleAfter(
      [this]() { startSync(); }, RECONNECT_INTERVAL_SECONDS * 1000.0f);
}

void FlipperConnectionManagerImpl::stop() {
  log_debug(LogLevel::Info, "[conn] Stop");
  if (certificateProvider_ &&
      certificateProvider_->shouldResetCertificateFolder()) {
    store_->resetState();
  }
  if (!started_) {
    log("[conn] Not started");
    return;
  }
  started_ = false;

  std::shared_ptr<std::promise<void>> joinPromise =
      std::make_shared<std::promise<void>>();
  std::future<void> join = joinPromise->get_future();
  scheduler_->schedule([this, joinPromise]() {
    socket_ = nullptr;
    joinPromise->set_value();
  });

  join.wait();
}

bool FlipperConnectionManagerImpl::isConnected() const {
  return isConnected_ && isConnectionTrusted_;
}

void FlipperConnectionManagerImpl::setCallbacks(Callbacks* callbacks) {
  callbacks_ = callbacks;
}

void FlipperConnectionManagerImpl::sendMessage(const folly::dynamic& message) {
  scheduler_->schedule([this, message]() {
    try {
      if (socket_) {
        socket_->send(message, []() {});
      }
    } catch (std::length_error& e) {
      // Skip sending messages that are too large.
      log(e.what());
      return;
    } catch (std::runtime_error& e) {
      // Skip sending messages with invalid K/V.
      // On newer versions of folly, this will throw a json::print_error.
      // Because we are using an older version of folly, we need to catch
      // the more generic std::runtime_error which is the base class for
      // json::print_error.
      log(e.what());
      return;
    }
  });
}

void FlipperConnectionManagerImpl::sendMessageRaw(const std::string& message) {
  scheduler_->schedule([this, message]() {
    try {
      if (socket_) {
        socket_->send(message, []() {});
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
  log_debug(LogLevel::Info, "[conn] Certificate exchange needed verification");
  if (failedConnectionAttempts_ >= 2) {
    return true;
  }

  auto last_known_medium = store_->getLastKnownMedium();
  if (!last_known_medium) {
    return true;
  }

  // When we exchange certs over WWW, we use a fake generated serial number and
  // a virtual device. If medium changes to FS_ACCESS at some point, we should
  // restart the exchange process to get the device ID of the real device.
  int medium = certificateProvider_ != nullptr
      ? certificateProvider_->getCertificateExchangeMedium()
      : FlipperCertificateExchangeMedium::FS_ACCESS;
  if (last_known_medium != medium) {
    return true;
  }

  auto step = state_->start("Check required certificates are present");
  bool hasRequiredFiles = store_->hasRequiredFiles();
  if (hasRequiredFiles) {
    step->complete();
  }
  return !hasRequiredFiles;
}

void FlipperConnectionManagerImpl::getCertificatesFromProvider(
    FlipperCertificateProvider& provider) {
  provider.setFlipperState(state_);
  auto gettingCertFromProvider =
      state_->start("Getting client certificate from certificate provider");

  try {
    provider.getCertificates(
        store_->getCertificateDirectoryPath(), store_->getDeviceId());
    gettingCertFromProvider->complete();
  } catch (std::exception& e) {
    gettingCertFromProvider->fail(e.what());
  } catch (...) {
    gettingCertFromProvider->fail("Exception thrown from certificate provider");
  }
}

void FlipperConnectionManagerImpl::processSignedCertificateResponse(
    std::shared_ptr<FlipperStep> gettingCert,
    std::string response,
    bool isError) {
  log_debug(LogLevel::Info, "[conn] Process signed certificate response");

  folly::dynamic messageAck = folly::dynamic::object;
  messageAck["method"] = "signCertificateAck";
  messageAck["isError"] = isError;

  if (isError) {
    auto error =
        "Flipper failed to provide certificates. Error from Flipper Desktop:\n" +
        response;
    log(error);
    gettingCert->fail(error);

  } else {
    int medium = certificateProvider_ != nullptr
        ? certificateProvider_->getCertificateExchangeMedium()
        : FlipperCertificateExchangeMedium::FS_ACCESS;

    if (!response.empty()) {
      folly::dynamic parsedResponse = folly::parseJson(response);

      folly::dynamic config = folly::dynamic::object;
      config["deviceId"] = parsedResponse["deviceId"];
      config["medium"] = medium;

      messageAck["config"] = config;

      store_->storeConnectionConfig(config);
      store_->storeConnectionEncryptedCertificates(parsedResponse);
    }
    if (certificateProvider_) {
      getCertificatesFromProvider(*certificateProvider_);
    }

    bool hasRequiredFiles = store_->hasRequiredFiles();

    if (!hasRequiredFiles && backupCertificateProvider_ &&
        store_->hasItem(ConnectionContextStore::StoreItem::ENCRYPTED_CERTS)) {
      getCertificatesFromProvider(*backupCertificateProvider_);
    }

    hasRequiredFiles = store_->hasRequiredFiles();
    messageAck["hasRequiredFiles"] = hasRequiredFiles;

    log("[conn] Certificate exchange complete with required files: " +
        std::to_string(hasRequiredFiles));
    gettingCert->complete();
  }

  auto logs = Logger::shared().getLogs();
  messageAck["logs"] = folly::toDynamic(logs);

  socket_->send(folly::toJson(messageAck), []() {});

  // Assigning null to the socket will disconnect the socket
  // with the caviat that the socket event hander will not be invoked.
  // Hence, call it ourselves.
  socket_ = nullptr;
  handleSocketEvent(SocketEvent::CLOSE);
}

void FlipperConnectionManagerImpl::requestSignedCertificate() {
  log_debug(LogLevel::Info, "[conn] Request signed certificate");
  auto resettingState = state_->start("Reset connection store state");
  store_->resetState();
  resettingState->complete();

  auto generatingCSR = state_->start("Generate CSR");
  std::string csr = store_->getCertificateSigningRequest();
  generatingCSR->complete();

  int medium = certificateProvider_ != nullptr
      ? certificateProvider_->getCertificateExchangeMedium()
      : FlipperCertificateExchangeMedium::FS_ACCESS;

  auto logs = Logger::shared().getLogs();

  auto timeSinceEpoch = std::chrono::system_clock::now().time_since_epoch();
  auto ms =
      std::chrono::duration_cast<std::chrono::milliseconds>(timeSinceEpoch);
  auto timestamp = ms.count();

  folly::dynamic message = folly::dynamic::object;

  message["method"] = "signCertificate";
  message["csr"] = csr.c_str();
  message["destination"] = store_->getCertificateDirectoryPath().c_str();
  message["medium"] = medium;
  message["logs"] = folly::toDynamic(logs);
  message["timestamp"] = timestamp;

  auto gettingCert = state_->start("Getting cert from desktop");

  socket_->sendExpectResponse(
      folly::toJson(message),
      [this, gettingCert](const std::string& response, bool isError) {
        scheduler_->schedule([this, gettingCert, response, isError]() {
          this->processSignedCertificateResponse(
              gettingCert, response, isError);
        });
      });
  failedConnectionAttempts_ = 0;
}

bool FlipperConnectionManagerImpl::isRunningInOwnThread() {
  return scheduler_->isRunningInOwnThread();
}

} // namespace flipper
} // namespace facebook
