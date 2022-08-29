/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include "winrt/Microsoft.ReactNative.h"

namespace winrt::ReactNativeFlipperExample::implementation {
struct ReactPackageProvider
    : winrt::implements<
          ReactPackageProvider,
          winrt::Microsoft::ReactNative::IReactPackageProvider> {
 public: // IReactPackageProvider
  void CreatePackage(winrt::Microsoft::ReactNative::IReactPackageBuilder const&
                         packageBuilder) noexcept;
};
} // namespace winrt::ReactNativeFlipperExample::implementation
