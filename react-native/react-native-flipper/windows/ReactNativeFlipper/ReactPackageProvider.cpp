/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// clang-format off
#include "pch.h"
#include "ReactPackageProvider.h"
#include "FlipperModule.h"

#if __has_include("ReactPackageProvider.g.cpp")
#include "ReactPackageProvider.g.cpp"
#endif
// clang-format on

using namespace winrt::Microsoft::ReactNative;

namespace winrt::ReactNativeFlipper::implementation {

void ReactPackageProvider::CreatePackage(
    IReactPackageBuilder const& packageBuilder) noexcept {
  AddAttributedModules(packageBuilder);
}

} // namespace winrt::ReactNativeFlipper::implementation
