/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

#pragma once

#include <Sonar/SonarPlugin.h>

namespace facebook {
namespace sonar {
namespace test {

class SonarPluginMock : public SonarPlugin {
  using ConnectionCallback =
      std::function<void(std::shared_ptr<SonarConnection>)>;
  using DisconnectionCallback = std::function<void()>;

 public:
  SonarPluginMock(const std::string& identifier) : identifier_(identifier) {}

  SonarPluginMock(
      const std::string& identifier,
      const ConnectionCallback& connectionCallback)
      : identifier_(identifier), connectionCallback_(connectionCallback) {}

  SonarPluginMock(
      const std::string& identifier,
      const ConnectionCallback& connectionCallback,
      const DisconnectionCallback& disconnectionCallback)
      : identifier_(identifier),
        connectionCallback_(connectionCallback),
        disconnectionCallback_(disconnectionCallback) {}

  std::string identifier() const override {
    return identifier_;
  }

  void didConnect(std::shared_ptr<SonarConnection> conn) override {
    if (connectionCallback_) {
      connectionCallback_(conn);
    }
  }

  void didDisconnect() override {
    if (disconnectionCallback_) {
      disconnectionCallback_();
    }
  }

 private:
  std::string identifier_;
  ConnectionCallback connectionCallback_;
  DisconnectionCallback disconnectionCallback_;
};

} // namespace test
} // namespace sonar
} // namespace facebook
