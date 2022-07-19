/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <folly/dynamic.h>
#include <folly/json.h>
#include "JSValue.h"
#include "NativeModules.h"

using namespace winrt::Microsoft::ReactNative;

namespace winrt::ReactNativeFlipper {

REACT_MODULE(FlipperModule, L"Flipper")
struct FlipperModule {
  REACT_INIT(Initialize)
  void Initialize(ReactContext const& reactContext) noexcept {
    m_reactContext = reactContext;

    // Initialise flipper, etc.
  }

  REACT_METHOD(registerPlugin)
  void registerPlugin(
      std::string pluginId,
      bool inBackground,
      std::function<void(std::string)>&& callback) noexcept {}

  REACT_METHOD(send)
  void
  send(std::string pluginId, std::string method, std::string data) noexcept {}

  REACT_METHOD(reportErrorWithMetadata)
  void reportErrorWithMetadata(
      std::string pluginId,
      std::string reason,
      std::string stacktrace) noexcept {}

  REACT_METHOD(reportError)
  void reportError(std::string pluginId, std::string error) noexcept {}

  REACT_METHOD(subscribe)
  void subscribe(std::string pluginId, std::string method) noexcept {}

  REACT_METHOD(respondSuccess)
  void respondSuccess(std::string responderId, std::string data) noexcept {}

  REACT_METHOD(respondError)
  void respondError(std::string responderId, std::string data) noexcept {}

 private:
  ReactContext m_reactContext{nullptr};
};

} // namespace winrt::ReactNativeFlipper
