/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include <Flipper/FlipperConnectionManagerImpl.h>
#include <Flipper/FlipperFollyScheduler.h>
#include <FlipperTestLib/ConnectionContextStoreMock.h>
#include <folly/Singleton.h>
#include <gtest/gtest.h>
#include <memory>

namespace facebook {
namespace flipper {
namespace test {

using folly::EventBase;

class FlipperConnectionManagerImplTerminationTest : public ::testing::Test {
 protected:
  std::shared_ptr<FlipperState> state;
  std::shared_ptr<ConnectionContextStore> contextStore;
  std::unique_ptr<Scheduler> sonarScheduler;
  std::unique_ptr<Scheduler> connectionScheduler;
  void SetUp() override {
    // Folly singletons must be registered before they are used.
    // Without this, test fails in phabricator.
    folly::SingletonVault::singleton()->registrationComplete();
    state = std::make_shared<FlipperState>();
    contextStore = std::make_shared<ConnectionContextStoreMock>();
    sonarScheduler = std::make_unique<FollyScheduler>(new EventBase());
    connectionScheduler = std::make_unique<FollyScheduler>(new EventBase());
  }
};

TEST_F(
    FlipperConnectionManagerImplTerminationTest,
    testNullEventBaseGetsRejected) {
  try {
    auto instance = std::make_shared<FlipperConnectionManagerImpl>(
        FlipperInitConfig{DeviceData{}, nullptr, connectionScheduler.get()},
        state,
        contextStore);
    FAIL();
  } catch (std::invalid_argument&) {
    // Pass test
  }
  try {
    auto instance = std::make_shared<FlipperConnectionManagerImpl>(
        FlipperInitConfig{DeviceData{}, sonarScheduler.get(), nullptr},
        state,
        contextStore);
    FAIL();
  } catch (std::invalid_argument&) {
    // Pass test
  }
}

TEST_F(
    FlipperConnectionManagerImplTerminationTest,
    testNonStartedEventBaseDoesntHang) {
  auto config = FlipperInitConfig{
      DeviceData{}, sonarScheduler.get(), connectionScheduler.get()};
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
  auto localSonarScheduler = std::make_unique<FollyScheduler>(flipperEventBase);
  auto localConnectionScheduler =
      std::make_unique<FollyScheduler>(connectionEventBase);
  auto config = FlipperInitConfig{
      DeviceData{}, localSonarScheduler.get(), localConnectionScheduler.get()};
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
