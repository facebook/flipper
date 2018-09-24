/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
#include "FlipperStep.h"
#include "FlipperState.h"

void FlipperStep::complete() {
  isLogged = true;
  state->success(name);
}

void FlipperStep::fail(std::string message) {
  isLogged = true;
  state->failed(name, message);
}

FlipperStep::FlipperStep(std::string step, FlipperState* s) {
  state = s;
  name = step;
}

FlipperStep::~FlipperStep() {
  if (!isLogged) {
    state->failed(name, "");
  }
}
