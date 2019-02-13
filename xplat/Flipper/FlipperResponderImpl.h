/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the LICENSE
 * file in the root directory of this source tree.
 */
#pragma once

#include <folly/io/async/EventBase.h>
#include <folly/json.h>
#include <rsocket/RSocketResponder.h>
#include "FlipperConnectionManager.h"
#include "FlipperResponder.h"

namespace facebook {
namespace flipper {

/* Responder to encapsulate yarpl observables and hide them from flipper core +
 * plugins */
class FlipperResponderImpl : public FlipperResponder {
 public:
  FlipperResponderImpl(
      std::shared_ptr<yarpl::single::SingleObserver<folly::dynamic>>
          downstreamObserver)
      : downstreamObserver_(downstreamObserver) {}

  void success(const folly::dynamic& response) override {
    const folly::dynamic message = folly::dynamic::object("success", response);
    isCompleted = true;
    downstreamObserver_->onSuccess(message);
  }

  void error(const folly::dynamic& response) override {
    const folly::dynamic message = folly::dynamic::object("error", response);
    isCompleted = true;
    downstreamObserver_->onSuccess(message);
  }

  ~FlipperResponderImpl() {
    if (!isCompleted) {
      downstreamObserver_->onSuccess(
          folly::dynamic::object("success", folly::dynamic::object()));
    }
  }

 private:
  std::shared_ptr<yarpl::single::SingleObserver<folly::dynamic>>
      downstreamObserver_;
  bool isCompleted = false;
};

} // namespace flipper
} // namespace facebook
