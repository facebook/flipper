/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <folly/dynamic.h>
#include <rsocket/RSocket.h>
#include <future>
#include <memory>
#include "FlipperSocket.h"
#include "FlipperTransportTypes.h"

namespace facebook {
namespace flipper {

class FlipperConnectionManager;
class ConnectionContextStore;
class FlipperRSocket : public FlipperSocket {
 public:
  FlipperRSocket(
      FlipperConnectionEndpoint endpoint,
      std::unique_ptr<FlipperSocketBasePayload> payload,
      folly::EventBase* eventBase);
  FlipperRSocket(
      FlipperConnectionEndpoint endpoint,
      std::unique_ptr<FlipperSocketBasePayload> payload,
      folly::EventBase* eventBase,
      ConnectionContextStore* connectionContextStore);

  virtual ~FlipperRSocket() {}

  virtual void setEventHandler(SocketEventHandler eventHandler) override;
  virtual void setMessageHandler(SocketMessageHandler messageHandler) override;

  virtual bool connect(FlipperConnectionManager* manager) override;
  virtual void disconnect() override;

  virtual void send(const folly::dynamic& message, SocketSendHandler completion)
      override;
  virtual void send(const std::string& message, SocketSendHandler completion)
      override;
  virtual void sendExpectResponse(
      const std::string& message,
      SocketSendExpectResponseHandler completion) override;

 private:
  FlipperConnectionEndpoint endpoint_;
  std::unique_ptr<FlipperSocketBasePayload> payload_;
  folly::EventBase* eventBase_;
  ConnectionContextStore* connectionContextStore_;

  std::unique_ptr<rsocket::RSocketClient> client_;

  SocketEventHandler eventHandler_;
  SocketMessageHandler messageHandler_;
};

} // namespace flipper
} // namespace facebook
