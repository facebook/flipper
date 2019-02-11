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

  void success(const folly::dynamic& response) const override {
    const folly::dynamic message = folly::dynamic::object("success", response);
    downstreamObserver_->onSuccess(message);
  }

  void error(const folly::dynamic& response) const override {
    const folly::dynamic message = folly::dynamic::object("error", response);
    downstreamObserver_->onSuccess(message);
  }

 private:
  std::shared_ptr<yarpl::single::SingleObserver<folly::dynamic>>
      downstreamObserver_;
};

} // namespace flipper
} // namespace facebook
