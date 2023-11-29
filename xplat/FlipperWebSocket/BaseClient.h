/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#pragma once

#include <Flipper/FlipperScheduler.h>
#include <Flipper/FlipperSocket.h>
#include <Flipper/FlipperSocketProvider.h>
#include <Flipper/FlipperTransportTypes.h>
#include <folly/dynamic.h>
#include <future>
#include <memory>
#include <mutex>

namespace facebook {
namespace flipper {

class FlipperConnectionManager;
class ConnectionContextStore;
class BaseClient {
 public:
  enum Status {
    Unconnected,
    Connecting,
    Initializing,
    Open,
    ServerNotFound,
    Failed,
    Closed
  };
  BaseClient(
      FlipperConnectionEndpoint endpoint,
      std::unique_ptr<FlipperSocketBasePayload> payload,
      Scheduler* scheduler)
      : endpoint_(std::move(endpoint)),
        payload_(std::move(payload)),
        scheduler_(scheduler) {}
  BaseClient(
      FlipperConnectionEndpoint endpoint,
      std::unique_ptr<FlipperSocketBasePayload> payload,
      Scheduler* scheduler,
      ConnectionContextStore* connectionContextStore)
      : endpoint_(std::move(endpoint)),
        payload_(std::move(payload)),
        scheduler_(scheduler),
        connectionContextStore_(connectionContextStore) {}

  BaseClient(const BaseClient&) = delete;
  BaseClient& operator=(const BaseClient&) = delete;

  virtual ~BaseClient() {}

  Status status() const {
    return status_;
  }

  void setEventHandler(SocketEventHandler eventHandler) {
    eventHandler_ = std::move(eventHandler);
  }

  void setMessageHandler(SocketMessageHandler messageHandler) {
    messageHandler_ = std::move(messageHandler);
  }

  virtual void connect(FlipperConnectionManager* manager) = 0;
  virtual void disconnect() = 0;

  virtual void send(
      const folly::dynamic& message,
      SocketSendHandler completion) = 0;
  virtual void send(
      const std::string& message,
      SocketSendHandler completion) = 0;
  virtual void sendExpectResponse(
      const std::string& message,
      SocketSendExpectResponseHandler completion) = 0;

 protected:
  FlipperConnectionEndpoint endpoint_;
  std::unique_ptr<FlipperSocketBasePayload> payload_;
  Scheduler* scheduler_;
  ConnectionContextStore* connectionContextStore_;

  SocketEventHandler eventHandler_;
  SocketMessageHandler messageHandler_;
  std::atomic<Status> status_;
};

} // namespace flipper
} // namespace facebook

#endif
