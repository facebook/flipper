/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <functional>

namespace facebook {
namespace flipper {

using Func = std::function<void()>;

struct Scheduler {
  virtual ~Scheduler() {}
  virtual void schedule(Func&& t) = 0;

  virtual void scheduleAfter(Func&& t, unsigned int ms) = 0;
  virtual bool isRunningInOwnThread() = 0;
};

} // namespace flipper
} // namespace facebook
