/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

#pragma once

#include <string>

class SonarState;

class SonarStep {
 public:
  void complete();
  SonarStep(std::string name, SonarState* state);
  ~SonarStep();

 private:
  std::string name;
  bool isCompleted = false;
  SonarState* state;
};
