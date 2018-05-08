/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
#pragma once

#include <Sonar/SonarConnection.h>
#include <string>

namespace facebook {
namespace sonar {

class SonarPlugin {
 public:
  virtual ~SonarPlugin() {}

  /**
  The plugin's identifier. This should map to a javascript plugin
  with the same identifier to ensure messages are sent correctly.
  */
  virtual std::string identifier() const = 0;

  /**
  Called when a connection has been established between this plugin
  and the corresponding plugin on the Sonar desktop app. The provided
  connection can be used to register method receivers as well as send
  messages back to the desktop app.
  */
  virtual void didConnect(std::shared_ptr<SonarConnection> conn) = 0;

  /**
  Called when a plugin has been disconnected and the SonarConnection
  provided in didConnect is no longer valid to use.
  */
  virtual void didDisconnect() = 0;
};

} // namespace sonar
} // namespace facebook
