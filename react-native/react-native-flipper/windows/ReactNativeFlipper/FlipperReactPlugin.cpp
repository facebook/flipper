/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "FlipperReactPlugin.h"

namespace facebook {
namespace flipper {

FlipperReactPlugin::FlipperReactPlugin(
    std::string pluginId,
    bool runInBackground,
    FlipperConnectionEvent handler)
    : pluginId_(std::move(pluginId)),
      runInBackground_(runInBackground),
      eventHandler_(std::move(handler)) {}

FlipperReactPlugin::~FlipperReactPlugin() {}

std::string FlipperReactPlugin::identifier() const {
  return pluginId_;
}

void FlipperReactPlugin::didConnect(
    std::shared_ptr<FlipperConnection> connection) {
  connection_ = connection;
  fireOnConnect();
}

void FlipperReactPlugin::didDisconnect() {
  connection_ = nullptr;
  fireOnDisconnect();
}

bool FlipperReactPlugin::runInBackground() {
  return runInBackground_;
}

void FlipperReactPlugin::fireOnConnect() {
  eventHandler_(pluginId_, FlipperReactPluginEvent::CONNECTED);
}

void FlipperReactPlugin::fireOnDisconnect() {
  eventHandler_(pluginId_, FlipperReactPluginEvent::DISCONNECTED);
}

bool FlipperReactPlugin::isConnected() {
  return connection_ != nullptr;
}

FlipperConnection* FlipperReactPlugin::getConnection() {
  return connection_.get();
}

} // namespace flipper
} // namespace facebook
