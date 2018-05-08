/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

#pragma once

#include <Sonar/SonarConnection.h>
#include <map>
#include <string>

namespace facebook {
namespace sonar {

class SonarConnectionMock : public SonarConnection {
 public:
  void send(const std::string& method, const folly::dynamic& params) override {
    sent_[method] = params;
  }

  void receive(const std::string& method, const SonarReceiver& receiver)
      override {
    receivers_[method] = receiver;
  }

  std::map<std::string, folly::dynamic> sent_;
  std::map<std::string, SonarReceiver> receivers_;
};

} // namespace sonar
} // namespace facebook
