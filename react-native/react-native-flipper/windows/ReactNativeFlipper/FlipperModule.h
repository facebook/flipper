/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include "JSValue.h"
#include "NativeModules.h"

#include <FlipperReactDeviceInfo.h>
#include <FlipperReactScheduler.h>
#include <FlipperReactSocket.h>
#include "../../../../xplat/Flipper/FlipperClient.h"
#include "../../../../xplat/Flipper/FlipperInitConfig.h"
#include "../../../../xplat/Flipper/FlipperScheduler.h"
#include "../../../../xplat/Flipper/FlipperSocketProvider.h"

using namespace winrt::Microsoft::ReactNative;

namespace winrt::ReactNativeFlipper {

REACT_MODULE(FlipperModule, L"Flipper")
struct FlipperModule {
  std::unique_ptr<facebook::flipper::Scheduler> sonarScheduler;
  std::unique_ptr<facebook::flipper::Scheduler> connectionScheduler;

  REACT_INIT(Initialize)
  void Initialize(ReactContext const& reactContext) noexcept {
    m_reactContext = reactContext;

    sonarScheduler =
        std::make_unique<facebook::flipper::FlipperReactScheduler>();
    connectionScheduler =
        std::make_unique<facebook::flipper::FlipperReactScheduler>();

    facebook::flipper::FlipperReactDeviceInfo deviceInfo;
    facebook::flipper::FlipperInitConfig config;
    config.deviceData.host = deviceInfo.getHost();
    config.deviceData.os = deviceInfo.getOS();
    config.deviceData.device = deviceInfo.getDevice();
    config.deviceData.deviceId = deviceInfo.getDeviceId();
    config.deviceData.app = deviceInfo.getAppName();
    config.deviceData.appId = deviceInfo.getAppId();
    config.deviceData.privateAppDirectory = deviceInfo.getAppStorageDirectory();
    config.callbackWorker = sonarScheduler.get();
    config.connectionWorker = connectionScheduler.get();

    facebook::flipper::FlipperClient::init(config);

    facebook::flipper::FlipperSocketProvider::setDefaultProvider(
        std::make_unique<facebook::flipper::FlipperWebSocketProvider>());

    facebook::flipper::FlipperClient::instance()->start();
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
