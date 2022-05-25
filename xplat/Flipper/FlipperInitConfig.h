/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <map>
#include "FlipperScheduler.h"

namespace facebook {
namespace flipper {

struct DeviceData {
  std::string host;
  std::string os;
  std::string device;
  std::string deviceId;
  std::string app;
  std::string appId;
  std::string privateAppDirectory;
};

struct FlipperInitConfig {
  /**
  Map of client specific configuration data such as app name, device name, etc.
  */
  DeviceData deviceData;

  /**
  Scheduler on which client callbacks should be called.
  */
  Scheduler* callbackWorker;

  /**
  Scheduler to be used to maintain the network connection.
  */
  Scheduler* connectionWorker;

  int insecurePort = 9089;
  int securePort = 9088;
  int altInsecurePort = 9089;
  int altSecurePort = 9088;
};

} // namespace flipper
} // namespace facebook
