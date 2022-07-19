/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once
#include "ReactPackageProvider.g.h"

using namespace winrt::Microsoft::ReactNative;

namespace winrt::ReactNativeFlipper::implementation {
struct ReactPackageProvider : ReactPackageProviderT<ReactPackageProvider> {
  ReactPackageProvider() = default;

  void CreatePackage(IReactPackageBuilder const& packageBuilder) noexcept;
};
} // namespace winrt::ReactNativeFlipper::implementation

namespace winrt::ReactNativeFlipper::factory_implementation {

struct ReactPackageProvider : ReactPackageProviderT<
                                  ReactPackageProvider,
                                  implementation::ReactPackageProvider> {};

} // namespace winrt::ReactNativeFlipper::factory_implementation
