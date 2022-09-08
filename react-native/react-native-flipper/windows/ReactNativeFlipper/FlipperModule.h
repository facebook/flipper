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
#include <FlipperReactPlugin.h>
#include <FlipperReactPluginManager.h>
#include <FlipperReactScheduler.h>
#include <FlipperReactSocket.h>
#include <map>
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
  std::unique_ptr<facebook::flipper::FlipperReactPluginManager> pluginManager;

  REACT_INIT(Initialize)
  void Initialize(ReactContext const& reactContext) noexcept {
    m_reactContext = reactContext;

    sonarScheduler =
        std::make_unique<facebook::flipper::FlipperReactScheduler>();
    connectionScheduler =
        std::make_unique<facebook::flipper::FlipperReactScheduler>();

    pluginManager =
        std::make_unique<facebook::flipper::FlipperReactPluginManager>();

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
      std::function<void(std::string)>&& callback) noexcept {
    bool registered = pluginManager->registerPlugin(
        pluginId,
        inBackground,
        [this](
            const std::string& pluginId,
            facebook::flipper::FlipperReactPluginEvent e) {
          const std::map<std::string, std::string> args{{"plugin", pluginId}};
          switch (e) {
            case facebook::flipper::FlipperReactPluginEvent::CONNECTED:
              return pluginOnConnect(args);
            case facebook::flipper::FlipperReactPluginEvent::DISCONNECTED:
              return pluginOnDisconnect(args);
          }
        });
    if (registered) {
      callback("ok");
    } else {
      callback("noflipper");
    }
  }

  REACT_METHOD(send)
  void
  send(std::string pluginId, std::string method, std::string data) noexcept {
    pluginManager->send(pluginId, method, data);
  }

  REACT_METHOD(reportErrorWithMetadata)
  void reportErrorWithMetadata(
      std::string pluginId,
      std::string reason,
      std::string stacktrace) noexcept {
    pluginManager->reportError(pluginId, reason, stacktrace);
  }

  REACT_METHOD(reportError)
  void reportError(std::string pluginId, std::string error) noexcept {
    pluginManager->reportError(pluginId, error);
  }

  REACT_METHOD(subscribe)
  void subscribe(std::string pluginId, std::string method) noexcept {
    pluginManager->subscribe(
        pluginId, method, [this](std::map<std::string, std::string> args) {
          onReceive(args);
        });
  }

  REACT_METHOD(respondSuccess)
  void respondSuccess(std::string responderId, std::string data) noexcept {
    pluginManager->respondSuccess(responderId, data);
  }

  REACT_METHOD(respondError)
  void respondError(std::string responderId, std::string data) noexcept {
    pluginManager->respondError(responderId, data);
  }

  REACT_EVENT(pluginOnConnect, L"react-native-flipper-plugin-connect")
  std::function<void(std::map<std::string, std::string>)> pluginOnConnect;

  REACT_EVENT(pluginOnDisconnect, L"react-native-flipper-plugin-disconnect")
  std::function<void(std::map<std::string, std::string>)> pluginOnDisconnect;

  REACT_EVENT(onReceive, L"react-native-flipper-receive-event")
  std::function<void(std::map<std::string, std::string>)> onReceive;

 private:
  ReactContext m_reactContext{nullptr};
};

} // namespace winrt::ReactNativeFlipper
