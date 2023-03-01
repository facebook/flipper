/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "FlipperState.h"
#include <vector>
#include "FlipperStateUpdateListener.h"
#include "FlipperStep.h"

#define FLIPPER_LOGS_CAPACITY 4096

#if FLIPPER_DEBUG_LOG
#include "Log.h"
#endif

using namespace facebook::flipper;

/* Class responsible for collecting state updates and combining them into a
 * view of the current state of the flipper client. */

FlipperState::FlipperState() {}

void FlipperState::setUpdateListener(
    std::shared_ptr<FlipperStateUpdateListener> listener) {
  std::lock_guard<std::mutex> lock(mutex);
  mListener = listener;
}

void FlipperState::started(std::string step) {
  std::shared_ptr<FlipperStateUpdateListener> localListener;
  {
    std::lock_guard<std::mutex> lock(mutex);
#if FLIPPER_DEBUG_LOG
    log("[started] " + step);
#endif
    if (stateMap.find(step) == stateMap.end()) {
      insertOrder.push_back(step);
    }
    stateMap[step] = State::in_progress;
    localListener = mListener;
  }
  // Need to drop the lock before issuing callback because the caller
  // might call us back (and is responsible for their own locking).
  if (localListener) {
    localListener->onUpdate();
  }
}

void FlipperState::ensureLogsCapacity() {
  if (logs.tellp() > FLIPPER_LOGS_CAPACITY) {
    logs.str("");
    logs.clear();
    logs << "[Truncated]" << std::endl;
  }
}

void FlipperState::success(std::string step) {
  std::shared_ptr<FlipperStateUpdateListener> localListener;
  {
    std::lock_guard<std::mutex> lock(mutex);
    std::string message = "[Success] " + step;
#if FLIPPER_DEBUG_LOG
    log(message);
#endif
    ensureLogsCapacity();
    logs << message << std::endl;

    stateMap[step] = State::success;
    localListener = mListener;
  }
  // Need to drop the lock before issuing callback because the caller
  // might call us back (and is responsible for their own locking).
  if (localListener) {
    localListener->onUpdate();
  }
}

void FlipperState::failed(std::string step, std::string errorMessage) {
  std::shared_ptr<FlipperStateUpdateListener> localListener;
  {
    std::lock_guard<std::mutex> lock(mutex);
    std::string message = "[Failed] " + step + ": " + errorMessage;
#if FLIPPER_DEBUG_LOG
    log(message);
#endif
    ensureLogsCapacity();
    logs << message << std::endl;
    stateMap[step] = State::failed;
    localListener = mListener;
  }
  // Need to drop the lock before issuing callback because the caller
  // might call us back (and is responsible for their own locking).
  if (localListener) {
    localListener->onUpdate();
  }
}

// TODO: Currently returns string, but should really provide a better
// representation of the current state so the UI can show it in a more intuitive
// way
std::string FlipperState::getState() {
  std::lock_guard<std::mutex> lock(mutex);
  return logs.str();
}

std::vector<StateElement> FlipperState::getStateElements() {
  std::lock_guard<std::mutex> lock(mutex);
  std::vector<StateElement> v;
  for (auto stepName : insertOrder) {
    v.push_back(StateElement(stepName, stateMap[stepName]));
  }
  return v;
}

std::shared_ptr<FlipperStep> FlipperState::start(std::string step_name) {
  // started() acquires the lock and we don't access any of our members below,
  // so we needn't take the lock.
  started(step_name);
  return std::make_shared<FlipperStep>(step_name, this);
}
