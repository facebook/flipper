/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include <Flipper/FlipperRSocketResponder.h>
#include <Flipper/Log.h>
#include <FlipperTestLib/FlipperConnectionManagerMock.h>
#include <folly/json.h>
#include <gtest/gtest.h>

namespace facebook {
namespace flipper {
namespace test {

using folly::dynamic;

class Callbacks
    : public facebook::flipper::FlipperConnectionManager::Callbacks {
 public:
  void onConnected() {}
  void onDisconnected() {}
  void onMessageReceived(
      const folly::dynamic& message,
      std::unique_ptr<FlipperResponder> responder) {
    message_ = message;
    responder_ = std::move(responder);
  }
  folly::dynamic message_;
  std::unique_ptr<FlipperResponder> responder_;
};

TEST(FlipperRSocketResponderTests, testFireAndForgetWithoutIdParam) {
  auto socket = facebook::flipper::test::FlipperConnectionManagerMock();
  auto callbacks = new Callbacks();
  socket.setCallbacks(callbacks);
  folly::EventBase* eb = new folly::EventBase();
  auto responder = facebook::flipper::FlipperRSocketResponder(&socket, eb);
  dynamic d = dynamic::object("my", "message");
  auto json = folly::toJson(d);

  responder.handleFireAndForget(rsocket::Payload(json), rsocket::StreamId(1));
  EXPECT_EQ(socket.messagesReceived.size(), 1);
  EXPECT_EQ(socket.messagesReceived[0]["my"], "message");
  EXPECT_EQ(socket.respondersWithIdReceived, 0);
  EXPECT_EQ(socket.respondersWithoutIdReceived, 1);
}

TEST(FlipperRSocketResponderTests, testFireAndForgetWithIdParam) {
  auto socket = facebook::flipper::test::FlipperConnectionManagerMock();
  auto callbacks = new Callbacks();
  socket.setCallbacks(callbacks);
  folly::EventBase* eb = new folly::EventBase();
  auto responder = facebook::flipper::FlipperRSocketResponder(&socket, eb);
  dynamic d = dynamic::object("my", "message")("id", 7);
  auto json = folly::toJson(d);

  responder.handleFireAndForget(rsocket::Payload(json), rsocket::StreamId(1));
  EXPECT_EQ(socket.messagesReceived.size(), 1);
  EXPECT_EQ(socket.messagesReceived[0]["my"], "message");
  EXPECT_EQ(socket.messagesReceived[0]["id"], 7);
  EXPECT_EQ(socket.respondersWithIdReceived, 1);
  EXPECT_EQ(socket.respondersWithoutIdReceived, 0);
}

} // namespace test
} // namespace flipper
} // namespace facebook
