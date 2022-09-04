/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <ReactDispatcher.h>
#include <winrt/Microsoft.ReactNative.h>
#include <thread>
#include "../../../../xplat/Flipper/FlipperScheduler.h"

using namespace winrt::Microsoft::ReactNative;

namespace facebook {
namespace flipper {

struct FlipperReactScheduler : public Scheduler {
  FlipperReactScheduler()
      : dispatcher_(ReactDispatcher::CreateSerialDispatcher()) {}
  virtual ~FlipperReactScheduler() {}

  virtual void schedule(facebook::flipper::Func&& t) override {
    dispatcher_.Post([t]() { t(); });
  }
  virtual void scheduleAfter(facebook::flipper::Func&& t, unsigned int ms)
      override {
    dispatcher_.Post([t, ms]() {
      std::this_thread::sleep_for(std::chrono::microseconds(ms));
      t();
    });
  }

  virtual bool isRunningInOwnThread() override {
    return true;
  }

 private:
  ReactDispatcher dispatcher_;
};

} // namespace flipper
} // namespace facebook
