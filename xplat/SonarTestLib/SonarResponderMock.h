/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

#pragma once

#include <Sonar/SonarResponder.h>
#include <folly/json.h>
#include <vector>

namespace facebook {
namespace sonar {

class SonarResponderMock : public SonarResponder {
 public:
  SonarResponderMock(
      std::vector<folly::dynamic>* successes = nullptr,
      std::vector<folly::dynamic>* errors = nullptr)
      : successes_(successes), errors_(errors) {}

  void success(const folly::dynamic& response) const override {
    if (successes_) {
      successes_->push_back(response);
    }
  }

  void error(const folly::dynamic& response) const override {
    if (errors_) {
      errors_->push_back(response);
    }
  }

 private:
  std::vector<folly::dynamic>* successes_;
  std::vector<folly::dynamic>* errors_;
};

} // namespace sonar
} // namespace facebook
