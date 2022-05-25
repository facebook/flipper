/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#pragma once

#import <Flipper/FlipperScheduler.h>
#import <Flipper/FlipperSocket.h>
#import <Flipper/FlipperSocketProvider.h>
#import <Flipper/FlipperTransportTypes.h>
#import <folly/dynamic.h>
#import <future>
#import <memory>

@class FlipperPlatformWebSocket;

namespace facebook {
namespace flipper {

class FlipperConnectionManager;
class ConnectionContextStore;
class FlipperWebSocket : public FlipperSocket {
 public:
  FlipperWebSocket(
      FlipperConnectionEndpoint endpoint,
      std::unique_ptr<FlipperSocketBasePayload> payload);
  FlipperWebSocket(
      FlipperConnectionEndpoint endpoint,
      std::unique_ptr<FlipperSocketBasePayload> payload,
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
  FlipperConnectionEndpoint endpoint_;
  std::unique_ptr<FlipperSocketBasePayload> payload_;
  ConnectionContextStore* connectionContextStore_;

  SocketEventHandler eventHandler_;
  SocketMessageHandler messageHandler_;

  FlipperPlatformWebSocket* socket_;
};

class FlipperWebSocketProvider : public FlipperSocketProvider {
 public:
  FlipperWebSocketProvider() {}
  virtual std::unique_ptr<FlipperSocket> create(
      FlipperConnectionEndpoint endpoint,
      std::unique_ptr<FlipperSocketBasePayload> payload,
      Scheduler* scheduler) override {
    return std::make_unique<FlipperWebSocket>(
        std::move(endpoint), std::move(payload));
  }
  virtual std::unique_ptr<FlipperSocket> create(
      FlipperConnectionEndpoint endpoint,
      std::unique_ptr<FlipperSocketBasePayload> payload,
      Scheduler* scheduler,
      ConnectionContextStore* connectionContextStore) override {
    return std::make_unique<FlipperWebSocket>(
        std::move(endpoint), std::move(payload), connectionContextStore);
  }
};

} // namespace flipper
} // namespace facebook

#endif
