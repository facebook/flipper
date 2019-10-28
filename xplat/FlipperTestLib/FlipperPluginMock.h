/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <Flipper/FlipperPlugin.h>

namespace facebook {
namespace flipper {
namespace test {

class FlipperPluginMock : public FlipperPlugin {
  using ConnectionCallback =
      std::function<void(std::shared_ptr<FlipperConnection>)>;
  using DisconnectionCallback = std::function<void()>;

 public:
  FlipperPluginMock(const std::string& identifier) : identifier_(identifier) {}

  FlipperPluginMock(
      const std::string& identifier,
      const ConnectionCallback& connectionCallback)
      : identifier_(identifier), connectionCallback_(connectionCallback) {}

  FlipperPluginMock(
      const std::string& identifier,
      const ConnectionCallback& connectionCallback,
      const DisconnectionCallback& disconnectionCallback)
      : identifier_(identifier),
        connectionCallback_(connectionCallback),
        disconnectionCallback_(disconnectionCallback) {}

  FlipperPluginMock(
      const std::string& identifier,
      const ConnectionCallback& connectionCallback,
      const DisconnectionCallback& disconnectionCallback,
      bool runInBackground)
      : identifier_(identifier),
        runInBackground_(runInBackground),
        connectionCallback_(connectionCallback),
        disconnectionCallback_(disconnectionCallback) {}

  std::string identifier() const override {
    return identifier_;
  }

  void didConnect(std::shared_ptr<FlipperConnection> conn) override {
    if (connectionCallback_) {
      connectionCallback_(conn);
    }
  }

  void didDisconnect() override {
    if (disconnectionCallback_) {
      disconnectionCallback_();
    }
  }

  bool runInBackground() override {
    return runInBackground_;
  }

 private:
  std::string identifier_;
  bool runInBackground_ = false;
  ConnectionCallback connectionCallback_;
  DisconnectionCallback disconnectionCallback_;
};

} // namespace test
} // namespace flipper
} // namespace facebook
