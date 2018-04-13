/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

#pragma once

#include <Sonar/SonarInitConfig.h>
#include <Sonar/SonarWebSocket.h>
#include <folly/Executor.h>
#include <folly/io/async/EventBase.h>
#include <rsocket/RSocket.h>
#include <mutex>

namespace facebook {
namespace sonar {

class ConnectionEvents;
class Responder;

class SonarWebSocketImpl : public SonarWebSocket {
  friend ConnectionEvents;
  friend Responder;

 public:
  SonarWebSocketImpl(SonarInitConfig config);

  ~SonarWebSocketImpl();

  void start() override;

  void stop() override;

  bool isOpen() const override;

  void setCallbacks(Callbacks* callbacks) override;

  void sendMessage(const folly::dynamic& message) override;

  void reconnect();

 private:
  bool isOpen_ = false;
  Callbacks* callbacks_;
  DeviceData deviceData_;

  folly::EventBase* worker_;
  std::unique_ptr<rsocket::RSocketClient> client_;
  bool connectionIsTrusted_;
  int failedConnectionAttempts_ = 0;

  void startSync();
  void doCertificateExchange();
  void connectSecurely();
  std::string loadCSRFromFile();
  std::string loadStringFromFile(std::string fileName);
  std::string absoluteFilePath(const char* relativeFilePath);
  bool isCertificateExchangeNeeded();
  void requestSignedCertFromSonar();
  bool ensureSonarDirExists();
};

} // namespace sonar
} // namespace facebook
