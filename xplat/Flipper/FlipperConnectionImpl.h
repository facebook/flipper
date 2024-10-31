/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <map>
#include <sstream>
#include <string>
#include "FlipperConnection.h"
#include "FlipperConnectionManager.h"
#include "Log.h"

namespace facebook {
namespace flipper {

class FlipperConnectionImpl : public FlipperConnection {
 public:
  FlipperConnectionImpl(
      FlipperConnectionManager* socket,
      const std::string& name);

  void call(
      const std::string& method,
      const folly::dynamic& params,
      std::shared_ptr<FlipperResponder> responder);

  void send(const std::string& method, const folly::dynamic& params) override;

  void sendRaw(const std::string& method, const std::string& params) override;

  void error(const std::string& message, const std::string& stacktrace)
      override;

  void receive(const std::string& method, const FlipperReceiver& receiver)
      override;

  /**
   * Runtime check which receivers are supported for this app
   */
  bool hasReceiver(const std::string& method);

 private:
  FlipperConnectionManager* socket_;
  std::string name_;
  std::map<std::string, FlipperReceiver> receivers_;
};

} // namespace flipper
} // namespace facebook
