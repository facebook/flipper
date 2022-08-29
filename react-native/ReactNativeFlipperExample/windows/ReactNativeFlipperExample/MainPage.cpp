/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// clang-format off
#include "pch.h"
#include "MainPage.h"

#if __has_include("MainPage.g.cpp")
#include "MainPage.g.cpp"
#endif

#include "App.h"
// clang-format on

using namespace winrt;
using namespace xaml;

namespace winrt::ReactNativeFlipperExample::implementation {
MainPage::MainPage() {
  InitializeComponent();
  auto app = Application::Current().as<App>();
  ReactRootView().ReactNativeHost(app->Host());
}
} // namespace winrt::ReactNativeFlipperExample::implementation
