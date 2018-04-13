/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

#pragma once

#include <folly/json.h>

namespace facebook {
namespace sonar {

/**
 * SonarResponder is used to asynchronously respond to messages
 * received from the Sonar desktop app.
 */
class SonarResponder {
 public:
  virtual ~SonarResponder(){};

  /**
   * Deliver a successful response to the Sonar desktop app.
   */
  virtual void success(const folly::dynamic& response) const = 0;

  /**
   * Inform the Sonar desktop app of an error in handling the request.
   */
  virtual void error(const folly::dynamic& response) const = 0;
};

} // namespace sonar
} // namespace facebook
