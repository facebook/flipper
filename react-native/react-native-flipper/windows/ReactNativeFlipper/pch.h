/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#define NOMINMAX

#include <CppWinRTIncludes.h>

#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif

#include <math.h>
#include <windows.h>

#include <condition_variable>
#include <functional>
#include <iostream>
#include <map>
#include <string>

#include <folly/dynamic.h>
#include <folly/json.h>

#include <hstring.h>
#include <restrictederrorinfo.h>
#include <unknwn.h>

#if __has_include(<VersionMacros.h>)
#include <VersionMacros.h>
#endif

#include <winrt/Microsoft.ReactNative.h>

#include <winrt/Microsoft.UI.Xaml.Automation.Peers.h>
#include <winrt/Microsoft.UI.Xaml.Controls.Primitives.h>
#include <winrt/Microsoft.UI.Xaml.Controls.h>
#include <winrt/Microsoft.UI.Xaml.Media.h>
#include <winrt/Microsoft.UI.Xaml.XamlTypeInfo.h>
using namespace winrt::Windows::Foundation;
