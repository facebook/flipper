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

struct FollyScopedThreadScheduler : public Scheduler {
  FollyScopedThreadScheduler() : FollyScopedThreadScheduler("") {}
  FollyScopedThreadScheduler(folly::StringPiece name)
      : thread_(nullptr, name) {}

  virtual void schedule(Func&& t) override {
    thread_.getEventBase()->add(t);
  }

  virtual void scheduleAfter(Func&& t, unsigned int ms) override {
    folly::makeFuture()
        .via(thread_.getEventBase())
        .delayed(std::chrono::milliseconds(ms))
        .thenValue([t](auto&&) { t(); });
  }

  virtual bool isRunningInOwnThread() override {
    return thread_.getEventBase()->isInEventBaseThread();
  }

 private:
  folly::ScopedEventBaseThread thread_;
};

} // namespace flipper
} // namespace facebook
