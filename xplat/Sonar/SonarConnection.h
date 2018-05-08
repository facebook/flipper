/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

#pragma once

#include <Sonar/SonarResponder.h>
#include <folly/json.h>
#include <functional>
#include <string>

namespace facebook {
namespace sonar {

/**
Represents a connection between the Desktop and mobile plugins
with corresponding identifiers.
*/
class SonarConnection {
 public:
  using SonarReceiver = std::function<
      void(const folly::dynamic&, std::unique_ptr<SonarResponder>)>;

  virtual ~SonarConnection() {}

  /**
  Invoke a method on the Sonar desktop plugin with with a matching identifier.
  */
  virtual void send(
      const std::string& method,
      const folly::dynamic& params) = 0;

  /**
  Report an error to the Sonar desktop app
  */
  virtual void error(
      const std::string& message,
      const std::string& stacktrace) = 0;

  /**
  Register a receiver to be notified of incoming calls of the given
  method from the Sonar desktop plugin with a matching identifier.
  */
  virtual void receive(
      const std::string& method,
      const SonarReceiver& receiver) = 0;
};

} // namespace sonar
} // namespace facebook
