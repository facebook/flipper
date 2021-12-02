/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <folly/Executor.h>
#include <folly/io/async/EventBase.h>
#include <mutex>
#include "FlipperConnectionManager.h"
#include "FlipperInitConfig.h"
#include "FlipperSocket.h"
#include "FlipperState.h"

namespace facebook {
namespace flipper {

class ConnectionEvents;
class ConnectionContextStore;
class FlipperRSocketResponder;
class FlipperConnectionManagerWrapper;
class FlipperConnectionManagerImpl : public FlipperConnectionManager {
  friend ConnectionEvents;

 public:
  FlipperConnectionManagerImpl(
      FlipperInitConfig config,
      std::shared_ptr<FlipperState> state,
      std::shared_ptr<ConnectionContextStore> contextStore);

  ~FlipperConnectionManagerImpl();

  void start() override;

  void stop() override;

  bool isOpen() const override;

  void setCallbacks(Callbacks* callbacks) override;

  void sendMessage(const folly::dynamic& message) override;

  void onMessageReceived(
      const folly::dynamic& message,
      std::unique_ptr<FlipperResponder> responder) override;

  void reconnect();
  void setCertificateProvider(
      const std::shared_ptr<FlipperCertificateProvider> provider) override;
  std::shared_ptr<FlipperCertificateProvider> getCertificateProvider() override;

 private:
  bool isOpen_ = false;
  bool isStarted_ = false;
  std::shared_ptr<FlipperCertificateProvider> certProvider_ = nullptr;
  Callbacks* callbacks_;
  DeviceData deviceData_;
  std::shared_ptr<FlipperState> flipperState_;
  int insecurePort;
  int securePort;
  int altInsecurePort;
  int altSecurePort;

  folly::EventBase* flipperEventBase_;
  folly::EventBase* connectionEventBase_;

  std::unique_ptr<FlipperSocket> client_;

  bool connectionIsTrusted_;
  bool certificateExchangeCompleted_ = false;

  int failedConnectionAttempts_ = 0;
  int failedSocketConnectionAttempts = 0;

  bool useLegacySocketProvider = false;

  std::shared_ptr<ConnectionContextStore> contextStore_;
  std::shared_ptr<FlipperConnectionManagerWrapper> implWrapper_;

  void startSync();
  bool connectAndExchangeCertificate();
  bool connectSecurely();
  bool isCertificateExchangeNeeded();
  void requestSignedCertFromFlipper();
  bool isRunningInOwnThread();
  void sendLegacyCertificateRequest(folly::dynamic message);
  void reevaluateSocketProvider();
  std::string getDeviceId();
};

} // namespace flipper
} // namespace facebook
