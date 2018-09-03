/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

#include <Sonar/SonarWebSocketImpl.h>

#include <gtest/gtest.h>

namespace facebook {
namespace sonar {
namespace test {

using folly::EventBase;

class SonarWebSocketImplTerminationTest : public ::testing::Test {
protected:
  void SetUp() override {
    // Folly singletons must be registered before they are used.
    // Without this, test fails in phabricator.
    folly::SingletonVault::singleton()->registrationComplete();
  }
};

TEST_F(SonarWebSocketImplTerminationTest, testNullEventBaseGetsRejected) {
  try {
    auto instance = std::make_shared<SonarWebSocketImpl>(SonarInitConfig {
      DeviceData {},
      nullptr,
      new EventBase()
    }, std::make_shared<SonarState>());
    FAIL();
  } catch (std::invalid_argument& e) {
    // Pass test
  }
  try {
    auto instance = std::make_shared<SonarWebSocketImpl>(SonarInitConfig {
      DeviceData {},
      new EventBase(),
      nullptr
    }, std::make_shared<SonarState>());
    FAIL();
  } catch (std::invalid_argument& e) {
    // Pass test
  }
}

TEST_F(SonarWebSocketImplTerminationTest, testNonStartedEventBaseDoesntHang) {
  auto config = SonarInitConfig {
    DeviceData {},
    new EventBase(),
    new EventBase()
  };
  auto state = std::make_shared<SonarState>();
  auto instance = std::make_shared<SonarWebSocketImpl>(config, state);
  instance->start();
}

TEST_F(SonarWebSocketImplTerminationTest, testStartedEventBaseDoesntHang) {
  auto sonarEventBase = new EventBase();
  auto connectionEventBase = new EventBase();
  auto sonarThread = std::thread([sonarEventBase](){
    sonarEventBase->loopForever();
  });
  auto connectionThread = std::thread([connectionEventBase](){
    connectionEventBase->loopForever();
  });
  auto config = SonarInitConfig {
    DeviceData {},
    sonarEventBase,
    connectionEventBase
  };
  auto state = std::make_shared<SonarState>();
  auto instance = std::make_shared<SonarWebSocketImpl>(config, state);

  instance->start();

  sonarEventBase->terminateLoopSoon();
  connectionEventBase->terminateLoopSoon();

  sonarThread.join();
  connectionThread.join();
}

} // namespace test
} // namespace sonar
} // namespace facebook
