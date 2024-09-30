/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "FlipperMultiPlugin.h"

namespace facebook {
namespace flipper {
FlipperMultiPlugin::FlipperMultiPlugin(
    std::vector<std::shared_ptr<FlipperPlugin>> plugins)
    : plugins_(std::move(plugins)) {
  assert(!plugins_.empty());
  for (const auto& plugin : plugins_) {
    auto identifier = plugin->identifier();
    auto identifier0 = plugins_[0]->identifier();
    assert(identifier == identifier0);
    assert(plugin->runInBackground() == plugins_[0]->runInBackground());
  }
}

std::string FlipperMultiPlugin::identifier() const {
  return plugins_[0]->identifier();
};

void FlipperMultiPlugin::addPlugin(std::shared_ptr<FlipperPlugin> plugin) {
  assert(plugin->identifier() == plugins_[0]->identifier());
  assert(plugin->runInBackground() == plugins_[0]->runInBackground());
  plugins_.push_back(std::move(plugin));
};

void FlipperMultiPlugin::didConnect(
    std::shared_ptr<flipper::FlipperConnection> conn) {
  for (const auto& plugin : plugins_) {
    plugin->didConnect(conn);
  }
};

void FlipperMultiPlugin::didDisconnect() {
  for (const auto& plugin : plugins_) {
    plugin->didDisconnect();
  }
}

bool FlipperMultiPlugin::runInBackground() {
  for (const auto& plugin : plugins_) {
    if (plugin->runInBackground()) {
      return true;
    }
  }
  return false;
}

} // namespace flipper
} // namespace facebook
