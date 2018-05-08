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
#include <mutex>

namespace easywsclient {
class WebSocket;
}

namespace facebook {
namespace sonar {

class SonarWebSocketImpl : public SonarWebSocket {
 public:
  SonarWebSocketImpl(SonarInitConfig config);

  ~SonarWebSocketImpl();

  void start() override;

  void stop() override;

  bool isOpen() const override;

  void setCallbacks(Callbacks* callbacks) override;

  void sendMessage(const folly::dynamic& message) override;

 private:
  std::unique_ptr<easywsclient::WebSocket> ws_;
  mutable std::mutex wsmutex_;
  bool stopped_ = false;
  Callbacks* callbacks_;
  std::string url_;
  std::unique_ptr<folly::Executor> sendQueue_;
  std::unique_ptr<folly::Executor> receiveQueue_;
  std::unique_ptr<folly::Executor> callbackQueue_;

  void reconnect();
  void reconnectAsync();
  void sendAsync(const std::string& message);
  void pumpAsync();
  void receiveMessage(const std::string& message);
};

} // namespace sonar
} // namespace facebook
