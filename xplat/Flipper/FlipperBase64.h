/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <string>

namespace facebook {
namespace flipper {

class Base64 {
 public:
  static std::string encode(const std::string& input);
};

} // namespace flipper
} // namespace facebook
