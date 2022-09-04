/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "FlipperReactDeviceInfo.h"

#include <winrt/Windows.ApplicationModel.h>
#include <winrt/Windows.Security.ExchangeActiveSyncProvisioning.h>

using namespace winrt::Windows::Foundation;

namespace facebook {
namespace flipper {

std::string FlipperReactDeviceInfo::getDevice() {
  try {
    return winrt::to_string(
        winrt::Windows::Security::ExchangeActiveSyncProvisioning::
            EasClientDeviceInformation()
                .SystemProductName());
  } catch (...) {
    return "unknown";
  }
}
std::string FlipperReactDeviceInfo::getDeviceId() {
  try {
    return winrt::to_string(
        winrt::Windows::Security::ExchangeActiveSyncProvisioning::
            EasClientDeviceInformation()
                .SystemSku());
  } catch (...) {
    return "unknown";
  }
}
std::string FlipperReactDeviceInfo::getHost() {
  return "localhost";
}
std::string FlipperReactDeviceInfo::getAppName() {
  return winrt::to_string(
      winrt::Windows::ApplicationModel::Package::Current().DisplayName());
}
std::string FlipperReactDeviceInfo::getAppId() {
  return winrt::to_string(
      winrt::Windows::ApplicationModel::Package::Current().Id().Name());
}

} // namespace flipper
} // namespace facebook
