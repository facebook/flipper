/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <string>

namespace facebook {
namespace flipper {

class FlipperReactDeviceInfo {
 public:
  std::string getDevice();
  std::string getDeviceId();
  std::string getHost();
  std::string getAppName();
  std::string getAppId();
};

} // namespace flipper
} // namespace facebook
