/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

#pragma once

#include <Sonar/SonarExecutorFactory.h>
#include <folly/Executor.h>
#include <map>

namespace facebook {
namespace sonar {

struct DeviceData {
  std::string host;
  std::string os;
  std::string device;
  std::string deviceId;
  std::string app;
};

struct SonarInitConfig {
  /**
  Map of client specific configuration data such as app name, device name, etc.
  */
  DeviceData deviceData;

  /**
  Factory for queues on which Sonar will do work internally.
  */
  std::unique_ptr<SonarExecutorFactory> workQueueFactory;

  /**
  Queue on which client callbacks should be called.
  */
  std::unique_ptr<folly::Executor> callbackQueue;
};

} // namespace sonar
} // namespace facebook
