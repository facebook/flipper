/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <Flipper/FireAndForgetBasedFlipperResponder.h>
#include <Flipper/FlipperConnectionManager.h>

namespace facebook {
namespace flipper {
namespace test {

class FlipperConnectionManagerMock : public FlipperConnectionManager {
 public:
  FlipperConnectionManagerMock() : callbacks(nullptr) {}

  void start() override {
    open = true;
    if (callbacks) {
      callbacks->onConnected();
    }
  }

  void stop() override {
    open = false;
    if (callbacks) {
      callbacks->onDisconnected();
    }
  }

  bool isOpen() const override {
    return open;
  }

  void sendMessage(const folly::dynamic& message) override {
    messages.push_back(message);
  }

  void setCertificateProvider(
      const std::shared_ptr<FlipperCertificateProvider> provider) override{};

  std::shared_ptr<FlipperCertificateProvider> getCertificateProvider()
      override {
    return nullptr;
  };

  void onMessageReceived(
      const folly::dynamic& message,
      std::unique_ptr<FlipperResponder> responder) override {
    if (responder) {
      const FireAndForgetBasedFlipperResponder* const r =
          dynamic_cast<FireAndForgetBasedFlipperResponder*>(responder.get());
      if (r) {
        if (r->hasId()) {
          ++respondersWithIdReceived;
        } else {
          ++respondersWithoutIdReceived;
        }
      } else {
        ++respondersWithIdReceived;
      }
    }
    callbacks->onMessageReceived(message, std::move(responder));
    messagesReceived.push_back(message);
  }

  void setCallbacks(Callbacks* aCallbacks) override {
    callbacks = aCallbacks;
  }

 public:
  bool open = false;
  Callbacks* callbacks;
  std::vector<folly::dynamic> messages;
  std::vector<folly::dynamic> messagesReceived;
  int respondersWithIdReceived = 0;
  int respondersWithoutIdReceived = 0;
};

} // namespace test
} // namespace flipper
} // namespace facebook
