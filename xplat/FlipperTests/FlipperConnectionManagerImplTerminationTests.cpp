/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include <Flipper/FlipperConnectionManagerImpl.h>
#include <FlipperTestLib/ConnectionContextStoreMock.h>
#include <folly/Singleton.h>

#include <gtest/gtest.h>

namespace facebook {
namespace flipper {
namespace test {

using folly::EventBase;

class FlipperConnectionManagerImplTerminationTest : public ::testing::Test {
 protected:
  std::shared_ptr<FlipperState> state;
  std::shared_ptr<ConnectionContextStore> contextStore;
  void SetUp() override {
    // Folly singletons must be registered before they are used.
    // Without this, test fails in phabricator.
    folly::SingletonVault::singleton()->registrationComplete();
    state = std::make_shared<FlipperState>();
    contextStore = std::make_shared<ConnectionContextStoreMock>();
  }
};

TEST_F(
    FlipperConnectionManagerImplTerminationTest,
    testNullEventBaseGetsRejected) {
  try {
    auto instance = std::make_shared<FlipperConnectionManagerImpl>(
        FlipperInitConfig{DeviceData{}, nullptr, new EventBase()},
        state,
        contextStore);
    FAIL();
  } catch (std::invalid_argument& e) {
    // Pass test
  }
  try {
    auto instance = std::make_shared<FlipperConnectionManagerImpl>(
        FlipperInitConfig{DeviceData{}, new EventBase(), nullptr},
        state,
        contextStore);
    FAIL();
  } catch (std::invalid_argument& e) {
    // Pass test
  }
}

TEST_F(
    FlipperConnectionManagerImplTerminationTest,
    testNonStartedEventBaseDoesntHang) {
  auto config =
      FlipperInitConfig{DeviceData{}, new EventBase(), new EventBase()};
  auto instance = std::make_shared<FlipperConnectionManagerImpl>(
      config, state, contextStore);
  instance->start();
}

TEST_F(
    FlipperConnectionManagerImplTerminationTest,
    testStartedEventBaseDoesntHang) {
  auto flipperEventBase = new EventBase();
  auto connectionEventBase = new EventBase();
  auto flipperThread =
      std::thread([flipperEventBase]() { flipperEventBase->loopForever(); });
  auto connectionThread = std::thread(
      [connectionEventBase]() { connectionEventBase->loopForever(); });
  auto config =
      FlipperInitConfig{DeviceData{}, flipperEventBase, connectionEventBase};
  auto instance = std::make_shared<FlipperConnectionManagerImpl>(
      config, state, contextStore);

  instance->start();

  flipperEventBase->terminateLoopSoon();
  connectionEventBase->terminateLoopSoon();

  flipperThread.join();
  connectionThread.join();
}

} // namespace test
} // namespace flipper
} // namespace facebook
