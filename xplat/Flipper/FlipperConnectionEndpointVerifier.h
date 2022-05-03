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
struct ConnectionEndpointVerifier {
  /** Verifies whether the given endpoint is listening
   for incoming connections. */
  static bool verify(const std::string& host, int port);
};
} // namespace flipper
} // namespace facebook
