/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

#include <Sonar/SonarWebSocketImpl.h>
#include <SonarTestLib/ConnectionContextStoreMock.h>

#include <gtest/gtest.h>

namespace facebook {
namespace flipper {
namespace test {

using folly::EventBase;

class SonarWebSocketImplTerminationTest : public ::testing::Test {
protected:
  std::shared_ptr<SonarState> state;
  std::shared_ptr<ConnectionContextStore> contextStore;
  void SetUp() override {
    // Folly singletons must be registered before they are used.
    // Without this, test fails in phabricator.
    folly::SingletonVault::singleton()->registrationComplete();
    state = std::make_shared<SonarState>();
    contextStore = std::make_shared<ConnectionContextStoreMock>();
  }
};

TEST_F(SonarWebSocketImplTerminationTest, testNullEventBaseGetsRejected) {
  try {
    auto instance = std::make_shared<SonarWebSocketImpl>(SonarInitConfig {
      DeviceData {},
      nullptr,
      new EventBase()
    },
    state,
    contextStore
    );
    FAIL();
  } catch (std::invalid_argument& e) {
    // Pass test
  }
  try {
    auto instance = std::make_shared<SonarWebSocketImpl>(SonarInitConfig {
      DeviceData {},
      new EventBase(),
      nullptr
    },
    state,
    contextStore
    );
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
  auto instance = std::make_shared<SonarWebSocketImpl>(config, state, contextStore);
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
  auto instance = std::make_shared<SonarWebSocketImpl>(config, state, contextStore);

  instance->start();

  sonarEventBase->terminateLoopSoon();
  connectionEventBase->terminateLoopSoon();

  sonarThread.join();
  connectionThread.join();
}

} // namespace test
} // namespace flipper
} // namespace facebook
