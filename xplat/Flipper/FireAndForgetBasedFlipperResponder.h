/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <folly/json.h>
#include "FlipperConnectionManager.h"
#include "FlipperResponder.h"

namespace facebook {
namespace flipper {

class FireAndForgetBasedFlipperResponder : public FlipperResponder {
 public:
  FireAndForgetBasedFlipperResponder(
      FlipperConnectionManager* socket,
      int64_t responseID)
      : socket_(socket), responseID_(responseID), idValid_(true) {}

  FireAndForgetBasedFlipperResponder(FlipperConnectionManager* socket)
      : socket_(socket), idValid_(false) {}

  void success(const folly::dynamic& response) override {
    const folly::dynamic message = idValid_
        ? folly::dynamic::object("id", responseID_)("success", response)
        : folly::dynamic::object("success", response);
    socket_->sendMessage(message);
  }

  void error(const folly::dynamic& response) override {
    const folly::dynamic message = idValid_
        ? folly::dynamic::object("id", responseID_)("error", response)
        : folly::dynamic::object("error", response);
    socket_->sendMessage(message);
  }

  bool hasId() const {
    return idValid_;
  }

 private:
  FlipperConnectionManager* socket_;
  int64_t responseID_;
  bool idValid_;
};

} // namespace flipper
} // namespace facebook
