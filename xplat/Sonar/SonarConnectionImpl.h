/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

#pragma once

#include <Sonar/SonarConnection.h>
#include <Sonar/SonarWebSocket.h>
#include <map>
#include <string>

namespace facebook {
namespace sonar {

class SonarConnectionImpl : public SonarConnection {
 public:
  SonarConnectionImpl(SonarWebSocket* socket, const std::string& name)
      : socket_(socket), name_(name) {}

  void call(
      const std::string& method,
      const folly::dynamic& params,
      std::unique_ptr<SonarResponder> responder) {
    if (receivers_.find(method) == receivers_.end()) {
      throw std::out_of_range("receiver " + method + " not found.");
    }
    receivers_.at(method)(params, std::move(responder));
  }

  void send(const std::string& method, const folly::dynamic& params) override {
    folly::dynamic message = folly::dynamic::object("method", "execute")(
        "params",
        folly::dynamic::object("api", name_)("method", method)(
            "params", params));
    socket_->sendMessage(message);
  }

  void error(const std::string& message, const std::string& stacktrace)
      override {
    socket_->sendMessage(folly::dynamic::object(
        "error",
        folly::dynamic::object("message", message)("stacktrace", stacktrace)));
  }

  void receive(const std::string& method, const SonarReceiver& receiver)
      override {
    receivers_[method] = receiver;
  }

 private:
  SonarWebSocket* socket_;
  std::string name_;
  std::map<std::string, SonarReceiver> receivers_;
};

} // namespace sonar
} // namespace facebook
