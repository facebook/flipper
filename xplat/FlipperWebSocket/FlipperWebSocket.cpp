/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#include "FlipperWebSocket.h"
#include <Flipper/ConnectionContextStore.h>
#include <Flipper/FlipperTransportTypes.h>
#include <Flipper/FlipperURLSerializer.h>
#include <Flipper/Log.h>
#include <folly/String.h>
#include <folly/futures/Future.h>
#include <folly/json.h>
#include <cctype>
#include <iomanip>
#include <sstream>
#include <stdexcept>
#include <string>
#include <thread>
#include "WebSocketClient.h"
#include "WebSocketTLSClient.h"

namespace facebook {
namespace flipper {

FlipperWebSocket::FlipperWebSocket(
    FlipperConnectionEndpoint endpoint,
    std::unique_ptr<FlipperSocketBasePayload> payload,
    Scheduler* scheduler)
    : FlipperWebSocket(
          std::move(endpoint),
          std::move(payload),
          scheduler,
          nullptr) {}

FlipperWebSocket::FlipperWebSocket(
    FlipperConnectionEndpoint endpoint,
    std::unique_ptr<FlipperSocketBasePayload> payload,
    Scheduler* scheduler,
    ConnectionContextStore* connectionContextStore) {
  if (endpoint.secure) {
    socket_ = std::make_unique<WebSocketTLSClient>(
        endpoint, std::move(payload), scheduler, connectionContextStore);
  } else {
    socket_ = std::make_unique<WebSocketClient>(
        endpoint, std::move(payload), scheduler, connectionContextStore);
  }
}

FlipperWebSocket::~FlipperWebSocket() {}

void FlipperWebSocket::setEventHandler(SocketEventHandler eventHandler) {
  socket_->setEventHandler(eventHandler);
}
void FlipperWebSocket::setMessageHandler(SocketMessageHandler messageHandler) {
  socket_->setMessageHandler(messageHandler);
}

void FlipperWebSocket::connect(FlipperConnectionManager* manager) {
  socket_->connect(manager);
}

void FlipperWebSocket::disconnect() {
  socket_->disconnect();
}

void FlipperWebSocket::send(
    const folly::dynamic& message,
    SocketSendHandler completion) {
  socket_->send(message, completion);
}

void FlipperWebSocket::send(
    const std::string& message,
    SocketSendHandler completion) {
  socket_->send(message, completion);
}

/**
    Only ever used for insecure connections to receive the device_id from a
    signCertificate request. If the intended usage ever changes, then a better
    approach needs to be put in place.
 */
void FlipperWebSocket::sendExpectResponse(
    const std::string& message,
    SocketSendExpectResponseHandler completion) {
  socket_->sendExpectResponse(message, completion);
}

} // namespace flipper
} // namespace facebook

#endif
