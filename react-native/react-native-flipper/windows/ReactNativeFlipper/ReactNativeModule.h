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

REACT_MODULE(ReactNativeModule, L"ReactNativeFlipper")
struct ReactNativeModule {
  // See https://microsoft.github.io/react-native-windows/docs/native-modules
  // for details on writing native modules

  REACT_INIT(Initialize)
  void Initialize(ReactContext const& reactContext) noexcept {
    m_reactContext = reactContext;
  }

  REACT_METHOD(sampleMethod)
  void sampleMethod(
      std::string stringArgument,
      int numberArgument,
      std::function<void(std::string)>&& callback) noexcept {
    // TODO: Implement some actually useful functionality
    callback(
        "Received numberArgument: " + std::to_string(numberArgument) +
        " stringArgument: " + stringArgument);
  }

 private:
  ReactContext m_reactContext{nullptr};
};

} // namespace winrt::ReactNativeFlipper
