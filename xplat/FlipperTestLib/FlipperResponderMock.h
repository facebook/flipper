/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <Flipper/FlipperResponder.h>
#include <folly/json.h>
#include <vector>

namespace facebook {
namespace flipper {

class FlipperResponderMock : public FlipperResponder {
 public:
  FlipperResponderMock(
      std::vector<folly::dynamic>* successes = nullptr,
      std::vector<folly::dynamic>* errors = nullptr)
      : successes_(successes), errors_(errors) {}

  void success(const folly::dynamic& response) override {
    if (successes_) {
      successes_->push_back(response);
    }
  }

  void error(const folly::dynamic& response) override {
    if (errors_) {
      errors_->push_back(response);
    }
  }

 private:
  std::vector<folly::dynamic>* successes_;
  std::vector<folly::dynamic>* errors_;
};

} // namespace flipper
} // namespace facebook
