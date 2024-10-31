/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "FlipperConnectionImpl.h"

namespace facebook {
namespace flipper {

FlipperConnectionImpl::FlipperConnectionImpl(
    FlipperConnectionManager* socket,
    const std::string& name)
    : socket_(socket), name_(name) {}

void FlipperConnectionImpl::call(
    const std::string& method,
    const folly::dynamic& params,
    std::shared_ptr<FlipperResponder> responder) {
  if (receivers_.find(method) == receivers_.end()) {
    std::string errorMessage = "Receiver " + method + " not found.";
    log("Error: " + errorMessage);
    responder->error(folly::dynamic::object("message", errorMessage));
    return;
  }
  try {
    receivers_.at(method)(params, responder);
  } catch (const std::exception& ex) {
    std::string errorMessage = "Receiver " + method + " failed with error. ";
    std::string reason = ex.what();
    errorMessage += "Error: '" + reason + "'.";
    log("Error: " + errorMessage);
    responder->error(folly::dynamic::object("message", errorMessage));
  }
}

void FlipperConnectionImpl::send(
    const std::string& method,
    const folly::dynamic& params) {
  folly::dynamic message = folly::dynamic::object("method", "execute")(
      "params",
      folly::dynamic::object("api", name_)("method", method)("params", params));
  socket_->sendMessage(message);
}

void FlipperConnectionImpl::sendRaw(
    const std::string& method,
    const std::string& params) {
  std::stringstream ss;
  ss << "{"
        "\"method\": \"execute\","
        "\"params\": {"
        "\"api\": \""
     << name_
     << "\","
        "\"method\": \""
     << method
     << "\","
        "\"params\":"
     << params << "}}";
  auto message = ss.str();
  socket_->sendMessageRaw(message);
}

void FlipperConnectionImpl::error(
    const std::string& message,
    const std::string& stacktrace) {
  socket_->sendMessage(folly::dynamic::object(
      "error",
      folly::dynamic::object("message", message)("stacktrace", stacktrace)));
}

void FlipperConnectionImpl::receive(
    const std::string& method,
    const FlipperReceiver& receiver) {
  receivers_[method] = receiver;
}

/**
Runtime check which receivers are supported for this app
*/
bool FlipperConnectionImpl::hasReceiver(const std::string& method) {
  return receivers_.find(method) != receivers_.end();
}

} // namespace flipper
} // namespace facebook
