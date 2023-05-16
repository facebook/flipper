/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "FlipperSocketProvider.h"
#include "FlipperSocket.h"
#include "FlipperTransportTypes.h"

namespace facebook {
namespace flipper {

std::unique_ptr<FlipperSocketProvider>&
FlipperSocketProvider::defaultProvider() {
  static std::unique_ptr<FlipperSocketProvider> provider;
  return provider;
}

std::unique_ptr<FlipperSocket> FlipperSocketProvider::socketCreate(
    FlipperConnectionEndpoint endpoint,
    std::unique_ptr<FlipperSocketBasePayload> payload,
    Scheduler* scheduler) {
  return defaultProvider()->create(
      std::move(endpoint), std::move(payload), scheduler);
}

std::unique_ptr<FlipperSocket> FlipperSocketProvider::socketCreate(
    FlipperConnectionEndpoint endpoint,
    std::unique_ptr<FlipperSocketBasePayload> payload,
    Scheduler* scheduler,
    ConnectionContextStore* connectionContextStore) {
  return defaultProvider()->create(
      std::move(endpoint),
      std::move(payload),
      scheduler,
      connectionContextStore);
}

void FlipperSocketProvider::setDefaultProvider(
    std::unique_ptr<FlipperSocketProvider> provider) {
  defaultProvider() = std::move(provider);
}

bool FlipperSocketProvider::hasProvider() {
  return defaultProvider() != nullptr;
}

} // namespace flipper
} // namespace facebook
