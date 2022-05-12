/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include "FlipperScheduler.h"

#include <folly/futures/Future.h>
#include <folly/io/async/EventBase.h>
#include <folly/io/async/ScopedEventBaseThread.h>

namespace facebook {
namespace flipper {

struct FollyScheduler : public facebook::flipper::Scheduler {
  FollyScheduler(folly::EventBase* eventLoop) : eventLoop_(eventLoop) {}
  virtual void schedule(Func&& t) override {
    eventLoop_->add(t);
  }
  virtual void scheduleAfter(Func&& t, unsigned int ms) override {
    folly::makeFuture()
        .via(eventLoop_)
        .delayed(std::chrono::milliseconds(ms))
        .thenValue([t](auto&&) { t(); });
  }

  virtual bool isRunningInOwnThread() override {
    return eventLoop_->isInEventBaseThread();
  }

 private:
  folly::EventBase* eventLoop_;
};

} // namespace flipper
} // namespace facebook
