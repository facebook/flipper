/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "FlipperReactSocket.h"
#include <folly/json.h>
#include <cctype>
#include <iomanip>
#include <sstream>
#include <stdexcept>
#include <string>
#include "../../../../xplat/Flipper/ConnectionContextStore.h"
#include "../../../../xplat/Flipper/FlipperTransportTypes.h"
#include "../../../../xplat/Flipper/FlipperURLSerializer.h"
#include "../../../../xplat/Flipper/Log.h"
#include "FlipperReactSocketClient.h"

namespace facebook {
namespace flipper {

FlipperReactSocket::FlipperReactSocket(
    FlipperConnectionEndpoint endpoint,
    std::unique_ptr<FlipperSocketBasePayload> payload,
    Scheduler* scheduler)
    : FlipperReactSocket(
          std::move(endpoint),
          std::move(payload),
          scheduler,
          nullptr) {}

FlipperReactSocket::FlipperReactSocket(
    FlipperConnectionEndpoint endpoint,
    std::unique_ptr<FlipperSocketBasePayload> payload,
    Scheduler* scheduler,
    ConnectionContextStore* connectionContextStore) {
  if (endpoint.secure) {
    socket_ = std::make_unique<FlipperReactSocketClient>(
        endpoint, std::move(payload), scheduler, connectionContextStore);
  } else {
    socket_ = std::make_unique<FlipperReactSocketClient>(
        endpoint, std::move(payload), scheduler, connectionContextStore);
  }
}

FlipperReactSocket::~FlipperReactSocket() {}

void FlipperReactSocket::setEventHandler(SocketEventHandler eventHandler) {
  socket_->setEventHandler(eventHandler);
}
void FlipperReactSocket::setMessageHandler(
    SocketMessageHandler messageHandler) {
  socket_->setMessageHandler(messageHandler);
}

bool FlipperReactSocket::connect(FlipperConnectionManager* manager) {
  return socket_->connect(manager);
}

void FlipperReactSocket::disconnect() {
  socket_->disconnect();
}

void FlipperReactSocket::send(
    const folly::dynamic& message,
    SocketSendHandler completion) {
  socket_->send(message, completion);
}

void FlipperReactSocket::send(
    const std::string& message,
    SocketSendHandler completion) {
  socket_->send(message, completion);
}

/**
    Only ever used for insecure connections to receive the device_id from a
    signCertificate request. If the intended usage ever changes, then a better
    approach needs to be put in place.
 */
void FlipperReactSocket::sendExpectResponse(
    const std::string& message,
    SocketSendExpectResponseHandler completion) {
  socket_->sendExpectResponse(message, completion);
}

} // namespace flipper
} // namespace facebook
