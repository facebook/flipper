/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

#pragma once

#include <folly/Executor.h>
#include <memory>
#include <string>

namespace facebook {
namespace sonar {

class SonarExecutorFactory {
 public:
  virtual ~SonarExecutorFactory() = default;

  virtual std::unique_ptr<folly::Executor> createExecutor(
      const std::string& executorName) = 0;
};

} // namespace sonar
} // namespace facebook