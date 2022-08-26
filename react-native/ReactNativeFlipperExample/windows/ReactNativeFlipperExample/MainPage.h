/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

// clang-format off
#include "MainPage.g.h"
#include <winrt/Microsoft.ReactNative.h>
// clang-format on

namespace winrt::ReactNativeFlipperExample::implementation {
struct MainPage : MainPageT<MainPage> {
  MainPage();
};
} // namespace winrt::ReactNativeFlipperExample::implementation

namespace winrt::ReactNativeFlipperExample::factory_implementation {
struct MainPage : MainPageT<MainPage, implementation::MainPage> {};
} // namespace winrt::ReactNativeFlipperExample::factory_implementation
