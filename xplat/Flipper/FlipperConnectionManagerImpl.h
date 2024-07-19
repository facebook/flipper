/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <mutex>
#include "FlipperConnectionManager.h"
#include "FlipperInitConfig.h"
#include "FlipperScheduler.h"
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

  bool isConnected() const override;

  void setCallbacks(Callbacks* callbacks) override;

  void sendMessage(const folly::dynamic& message) override;

  void sendMessageRaw(const std::string& message) override;

  void onMessageReceived(
      const folly::dynamic& message,
      std::unique_ptr<FlipperResponder> responder) override;

  void reconnect();

  void setCertificateProvider(
      const std::shared_ptr<FlipperCertificateProvider> provider) override;

  void setBackupCertificateProvider(
      const std::shared_ptr<FlipperCertificateProvider> provider) override;

  std::shared_ptr<FlipperCertificateProvider> getCertificateProvider() override;

 private:
  bool isConnected_ = false;
  bool started_ = false;
  bool isConnectionTrusted_ = false;

  std::shared_ptr<FlipperCertificateProvider> certificateProvider_ = nullptr;
  std::shared_ptr<FlipperCertificateProvider> backupCertificateProvider_ =
      nullptr;

  Callbacks* callbacks_;

  DeviceData deviceData_;

  std::shared_ptr<FlipperState> state_;

  int insecurePort;
  int securePort;
  int altInsecurePort;
  int altSecurePort;

  Scheduler* scheduler_;
  Scheduler* connectionScheduler_;

  std::unique_ptr<FlipperSocket> socket_;

  int failedConnectionAttempts_ = 0;

  std::shared_ptr<ConnectionContextStore> store_;
  std::shared_ptr<FlipperConnectionManagerWrapper> implWrapper_;

  void startSync();
  void connectAndExchangeCertificate();
  void connectSecurely();
  void handleSocketEvent(const SocketEvent event);
  bool isCertificateExchangeNeeded();
  void requestSignedCertificate();
  void processSignedCertificateResponse(
      std::shared_ptr<FlipperStep> gettingCertificateStep,
      std::string response,
      bool isError);
  void getCertificatesFromProvider(FlipperCertificateProvider& provider);
  bool isRunningInOwnThread();
  void reevaluateSocketProvider();
  std::string getDeviceId();
};

} // namespace flipper
} // namespace facebook
