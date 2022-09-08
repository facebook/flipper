/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <folly/dynamic.h>
#include <future>
#include <memory>
#include <mutex>
#include "../../../../xplat/Flipper/FlipperSocket.h"
#include "../../../../xplat/Flipper/FlipperSocketProvider.h"
#include "FlipperReactBaseSocket.h"

namespace facebook {
namespace flipper {

class FlipperConnectionManager;
class ConnectionContextStore;
class FlipperReactSocket : public FlipperSocket {
 public:
  FlipperReactSocket(
      FlipperConnectionEndpoint endpoint,
      std::unique_ptr<FlipperSocketBasePayload> payload,
      Scheduler* scheduler);
  FlipperReactSocket(
      FlipperConnectionEndpoint endpoint,
      std::unique_ptr<FlipperSocketBasePayload> payload,
      Scheduler* scheduler,
      ConnectionContextStore* connectionContextStore);

  virtual ~FlipperReactSocket();

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
  std::unique_ptr<FlipperReactBaseSocket> socket_;
};

class FlipperWebSocketProvider : public FlipperSocketProvider {
 public:
  FlipperWebSocketProvider() {}
  virtual std::unique_ptr<FlipperSocket> create(
      FlipperConnectionEndpoint endpoint,
      std::unique_ptr<FlipperSocketBasePayload> payload,
      Scheduler* scheduler) override {
    return std::make_unique<FlipperReactSocket>(
        std::move(endpoint), std::move(payload), scheduler);
  }
  virtual std::unique_ptr<FlipperSocket> create(
      FlipperConnectionEndpoint endpoint,
      std::unique_ptr<FlipperSocketBasePayload> payload,
      Scheduler* scheduler,
      ConnectionContextStore* connectionContextStore) override {
    return std::make_unique<FlipperReactSocket>(
        std::move(endpoint),
        std::move(payload),
        scheduler,
        connectionContextStore);
  }
};

} // namespace flipper
} // namespace facebook
