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

std::unique_ptr<FlipperSocketProvider> FlipperSocketProvider::provider_ =
    nullptr;

std::unique_ptr<FlipperSocketProvider> FlipperSocketProvider::shelvedProvider_ =
    nullptr;

std::unique_ptr<FlipperSocket> FlipperSocketProvider::socketCreate(
    FlipperConnectionEndpoint endpoint,
    std::unique_ptr<FlipperSocketBasePayload> payload,
    folly::EventBase* eventBase) {
  return provider_->create(std::move(endpoint), std::move(payload), eventBase);
}

std::unique_ptr<FlipperSocket> FlipperSocketProvider::socketCreate(
    FlipperConnectionEndpoint endpoint,
    std::unique_ptr<FlipperSocketBasePayload> payload,
    folly::EventBase* eventBase,
    ConnectionContextStore* connectionContextStore) {
  return provider_->create(
      std::move(endpoint),
      std::move(payload),
      eventBase,
      connectionContextStore);
}

void FlipperSocketProvider::setDefaultProvider(
    std::unique_ptr<FlipperSocketProvider> provider) {
  provider_ = std::move(provider);
}

bool FlipperSocketProvider::hasProvider() {
  return provider_ != nullptr;
}

} // namespace flipper
} // namespace facebook
