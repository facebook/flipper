/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <memory>
#include "../../../../xplat/Flipper/FlipperPlugin.h"

namespace facebook {
namespace flipper {

enum class FlipperReactPluginEvent { CONNECTED, DISCONNECTED };

using FlipperConnectionEvent =
    std::function<void(const std::string& pluginId, FlipperReactPluginEvent e)>;

class FlipperReactPlugin : public FlipperPlugin {
 public:
  FlipperReactPlugin(
      std::string pluginId,
      bool runInBackground,
      FlipperConnectionEvent handler);
  virtual ~FlipperReactPlugin();

  virtual std::string identifier() const override;

  virtual void didConnect(std::shared_ptr<FlipperConnection> conn) override;

  virtual void didDisconnect() override;

  virtual bool runInBackground() override;

  void fireOnConnect();
  void fireOnDisconnect();

  bool isConnected();

  FlipperConnection* getConnection();

 private:
  std::string pluginId_;
  bool runInBackground_;
  std::shared_ptr<FlipperConnection> connection_;
  FlipperConnectionEvent eventHandler_;
};

} // namespace flipper
} // namespace facebook
