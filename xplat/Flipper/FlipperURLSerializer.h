/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <folly/json.h>
#include <string>
#include "FlipperTransportTypes.h"

namespace facebook {
namespace flipper {

class URLSerializer : public FlipperPayloadSerializer {
 public:
  void put(std::string key, std::string value) override;
  void put(std::string key, int value) override;

  std::string serialize() override;
  ~URLSerializer() {}

 private:
  std::string url_encode(const std::string& value);
  folly::dynamic object_ = folly::dynamic::object();
};

} // namespace flipper
} // namespace facebook
