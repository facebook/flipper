/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
#include "SonarState.h"
#include "SonarStateUpdateListener.h"
#include "SonarStep.h"

/* Class responsible for collecting state updates and combining them into a
 * view of the current state of the sonar client. */

SonarState::SonarState() {
  stateUpdates = "";
}
void SonarState::setUpdateListener(
    std::shared_ptr<SonarStateUpdateListener> listener) {
  mListener = listener;
}

void SonarState::started(std::string step) {
  stateUpdates = stateUpdates + "[Started] " + step + "\n";
  if (mListener) {
    mListener->onUpdate();
  }
}

void SonarState::success(std::string step) {
  stateUpdates = stateUpdates + "[Success] " + step + "\n";
  if (mListener) {
    mListener->onUpdate();
  }
}

void SonarState::failed(std::string step, std::string errorMessage) {
  stateUpdates = stateUpdates + "[Failed] " + step + "\n";
  if (mListener) {
    mListener->onUpdate();
  }
}

// TODO: Currently returns string, but should really provide a better
// representation of the current state so the UI can show it in a more intuitive
// way
std::string SonarState::getState() {
  return stateUpdates;
}

std::shared_ptr<SonarStep> SonarState::start(std::string step_name) {
  started(step_name);
  return std::make_shared<SonarStep>(step_name, this);
}
