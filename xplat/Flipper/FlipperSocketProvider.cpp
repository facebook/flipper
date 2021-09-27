/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "FlipperSocketProvider.h"
#include "FlipperRSocket.h"
#include "FlipperTransportTypes.h"

namespace facebook {
namespace flipper {

class FlipperDefaultSocketProvider : public FlipperSocketProvider {
 public:
  FlipperDefaultSocketProvider() {}
  virtual std::unique_ptr<FlipperSocket> create(
      FlipperConnectionEndpoint endpoint,
      std::unique_ptr<FlipperSocketBasePayload> payload,
      folly::EventBase* eventBase) override {
    return std::make_unique<FlipperRSocket>(
        std::move(endpoint), std::move(payload), eventBase);
  }
  virtual std::unique_ptr<FlipperSocket> create(
      FlipperConnectionEndpoint endpoint,
      std::unique_ptr<FlipperSocketBasePayload> payload,
      folly::EventBase* eventBase,
      ConnectionContextStore* connectionContextStore) override {
    return std::make_unique<FlipperRSocket>(
        std::move(endpoint),
        std::move(payload),
        eventBase,
        connectionContextStore);
  }
};

std::unique_ptr<FlipperSocketProvider> FlipperSocketProvider::provider_ =
    std::make_unique<FlipperDefaultSocketProvider>();

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

void FlipperSocketProvider::shelveDefault() {
  shelvedProvider_ = std::move(provider_);
  provider_ = std::make_unique<FlipperDefaultSocketProvider>();
}

void FlipperSocketProvider::unshelveDefault() {
  provider_ = std::move(shelvedProvider_);
}

} // namespace flipper
} // namespace facebook
