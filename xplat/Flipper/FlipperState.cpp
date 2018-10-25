/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
#include "FlipperState.h"
#include "FlipperStateUpdateListener.h"
#include "FlipperStep.h"
#include <vector>

#if FLIPPER_DEBUG_LOG
#include "Log.h"
#endif

using namespace facebook::flipper;

/* Class responsible for collecting state updates and combining them into a
 * view of the current state of the flipper client. */

FlipperState::FlipperState() : logs("") {}
void FlipperState::setUpdateListener(
    std::shared_ptr<FlipperStateUpdateListener> listener) {
  mListener = listener;
}

void FlipperState::started(std::string step) {
#if FLIPPER_DEBUG_LOG
  log("[started] " + step);
#endif
  if (stateMap.find(step) == stateMap.end()) {
    insertOrder.push_back(step);
  }
  stateMap[step] = State::in_progress;
  if (mListener) {
    mListener->onUpdate();
  }
}

void FlipperState::success(std::string step) {
#if FLIPPER_DEBUG_LOG
  log("[finished] " + step);
#endif
  logs = logs + "[Success] " + step + "\n";
  stateMap[step] = State::success;
  if (mListener) {
    mListener->onUpdate();
  }
}

void FlipperState::failed(std::string step, std::string errorMessage) {
#if FLIPPER_DEBUG_LOG
  log("[failed] " + step);
#endif
  logs = logs + "[Failed] " + step + ": " + errorMessage + "\n";
  stateMap[step] = State::failed;
  if (mListener) {
    mListener->onUpdate();
  }
}

// TODO: Currently returns string, but should really provide a better
// representation of the current state so the UI can show it in a more intuitive
// way
std::string FlipperState::getState() {
  return logs;
}

std::vector<StateElement> FlipperState::getStateElements() {
  std::vector<StateElement> v;
  for (auto stepName : insertOrder) {
    v.push_back(StateElement(stepName, stateMap[stepName]));
  }
  return v;
}

std::shared_ptr<FlipperStep> FlipperState::start(std::string step_name) {
  started(step_name);
  return std::make_shared<FlipperStep>(step_name, this);
}
