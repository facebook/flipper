/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#pragma once

#include <Flipper/FlipperSocket.h>
#include <Flipper/FlipperSocketProvider.h>
#include <Flipper/FlipperTransportTypes.h>
#include <folly/dynamic.h>
#include <folly/io/async/EventBase.h>
#include <future>
#include <memory>
#include <mutex>
#include "BaseClient.h"

namespace facebook {
namespace flipper {

class FlipperConnectionManager;
class ConnectionContextStore;
class FlipperWebSocket : public FlipperSocket {
 public:
  FlipperWebSocket(
      FlipperConnectionEndpoint endpoint,
      std::unique_ptr<FlipperSocketBasePayload> payload,
      folly::EventBase* eventBase);
  FlipperWebSocket(
      FlipperConnectionEndpoint endpoint,
      std::unique_ptr<FlipperSocketBasePayload> payload,
      folly::EventBase* eventBase,
      ConnectionContextStore* connectionContextStore);

  virtual ~FlipperWebSocket();

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
  std::unique_ptr<BaseClient> socket_;
};

class FlipperWebSocketProvider : public FlipperSocketProvider {
 public:
  FlipperWebSocketProvider() {}
  virtual std::unique_ptr<FlipperSocket> create(
      FlipperConnectionEndpoint endpoint,
      std::unique_ptr<FlipperSocketBasePayload> payload,
      folly::EventBase* eventBase) override {
    return std::make_unique<FlipperWebSocket>(
        std::move(endpoint), std::move(payload), eventBase);
  }
  virtual std::unique_ptr<FlipperSocket> create(
      FlipperConnectionEndpoint endpoint,
      std::unique_ptr<FlipperSocketBasePayload> payload,
      folly::EventBase* eventBase,
      ConnectionContextStore* connectionContextStore) override {
    return std::make_unique<FlipperWebSocket>(
        std::move(endpoint),
        std::move(payload),
        eventBase,
        connectionContextStore);
  }
};

} // namespace flipper
} // namespace facebook

#endif
