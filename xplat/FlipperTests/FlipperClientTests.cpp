/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

#include <Flipper/FlipperClient.h>
#include <FlipperTestLib/FlipperPluginMock.h>
#include <FlipperTestLib/FlipperConnectionManagerMock.h>

#include <folly/json.h>
#include <gtest/gtest.h>

namespace facebook {
namespace flipper {
namespace test {

using folly::dynamic;

auto state = std::make_shared<FlipperState>();

TEST(FlipperClientTests, testSaneMocks) {
  FlipperConnectionManagerMock socket;
  socket.start();
  EXPECT_TRUE(socket.isOpen());
  socket.stop();
  EXPECT_FALSE(socket.isOpen());

  FlipperPluginMock plugin("Test");
  EXPECT_EQ(plugin.identifier(), "Test");
}

TEST(FlipperClientTests, testGetPlugins) {
  auto socket = new FlipperConnectionManagerMock;
  FlipperClient client(std::unique_ptr<FlipperConnectionManagerMock>{socket}, state);
  client.start();

  client.addPlugin(std::make_shared<FlipperPluginMock>("Cat"));
  client.addPlugin(std::make_shared<FlipperPluginMock>("Dog"));

  dynamic message = dynamic::object("id", 1)("method", "getPlugins");
  socket->callbacks->onMessageReceived(message);

  dynamic expected = dynamic::object("id", 1)(
      "success", dynamic::object("plugins", dynamic::array("Cat", "Dog")));
  EXPECT_EQ(socket->messages.back(), expected);
}

TEST(FlipperClientTests, testGetPlugin) {
  auto socket = new FlipperConnectionManagerMock;
  FlipperClient client(std::unique_ptr<FlipperConnectionManagerMock>{socket}, state);

  const auto catPlugin = std::make_shared<FlipperPluginMock>("Cat");
  client.addPlugin(catPlugin);
  const auto dogPlugin = std::make_shared<FlipperPluginMock>("Dog");
  client.addPlugin(dogPlugin);

  EXPECT_EQ(catPlugin, client.getPlugin("Cat"));
  EXPECT_EQ(dogPlugin, client.getPlugin("Dog"));
}

TEST(FlipperClientTests, testGetPluginWithDowncast) {
  auto socket = new FlipperConnectionManagerMock;
  FlipperClient client(std::unique_ptr<FlipperConnectionManagerMock>{socket}, state);

  const auto catPlugin = std::make_shared<FlipperPluginMock>("Cat");
  client.addPlugin(catPlugin);
  EXPECT_EQ(catPlugin, client.getPlugin<FlipperPluginMock>("Cat"));
}

TEST(FlipperClientTests, testRemovePlugin) {
  auto socket = new FlipperConnectionManagerMock;
  FlipperClient client(std::unique_ptr<FlipperConnectionManagerMock>{socket}, state);
  client.start();

  auto plugin = std::make_shared<FlipperPluginMock>("Test");
  client.addPlugin(plugin);
  client.removePlugin(plugin);

  dynamic message = dynamic::object("id", 1)("method", "getPlugins");
  socket->callbacks->onMessageReceived(message);

  dynamic expected = dynamic::object("id", 1)(
      "success", dynamic::object("plugins", dynamic::array()));
  EXPECT_EQ(socket->messages.back(), expected);
}

TEST(FlipperClientTests, testStartStop) {
  auto socket = new FlipperConnectionManagerMock;
  FlipperClient client(std::unique_ptr<FlipperConnectionManagerMock>{socket}, state);

  client.start();
  EXPECT_TRUE(socket->isOpen());

  client.stop();
  EXPECT_FALSE(socket->isOpen());
}

TEST(FlipperClientTests, testConnectDisconnect) {
  auto socket = new FlipperConnectionManagerMock;
  FlipperClient client(std::unique_ptr<FlipperConnectionManagerMock>{socket}, state);

  bool pluginConnected = false;
  const auto connectionCallback = [&](std::shared_ptr<FlipperConnection> conn) {
    pluginConnected = true;
  };
  const auto disconnectionCallback = [&]() { pluginConnected = false; };
  auto plugin = std::make_shared<FlipperPluginMock>("Test", connectionCallback,
                                                  disconnectionCallback);
  client.addPlugin(plugin);

  client.start();
  dynamic messageInit = dynamic::object("method", "init")(
      "params", dynamic::object("plugin", "Test"));
  socket->callbacks->onMessageReceived(messageInit);
  EXPECT_TRUE(pluginConnected);

  client.stop();
  EXPECT_FALSE(pluginConnected);
}

TEST(FlipperClientTests, testInitDeinit) {
  auto socket = new FlipperConnectionManagerMock;
  FlipperClient client(std::unique_ptr<FlipperConnectionManagerMock>{socket}, state);

  bool pluginConnected = false;
  const auto connectionCallback = [&](std::shared_ptr<FlipperConnection> conn) {
    pluginConnected = true;
  };
  const auto disconnectionCallback = [&]() { pluginConnected = false; };
  auto plugin = std::make_shared<FlipperPluginMock>("Test", connectionCallback,
                                                  disconnectionCallback);

  client.start();
  client.addPlugin(plugin);
  EXPECT_FALSE(pluginConnected);

  dynamic expected = dynamic::object("method", "refreshPlugins");
  EXPECT_EQ(socket->messages.front(), expected);

  dynamic messageInit = dynamic::object("method", "init")(
      "params", dynamic::object("plugin", "Test"));
  socket->callbacks->onMessageReceived(messageInit);
  EXPECT_TRUE(pluginConnected);

  dynamic messageDeinit = dynamic::object("method", "deinit")(
      "params", dynamic::object("plugin", "Test"));
  socket->callbacks->onMessageReceived(messageDeinit);
  EXPECT_FALSE(pluginConnected);

  dynamic messageReinit = dynamic::object("method", "init")(
      "params", dynamic::object("plugin", "Test"));
  socket->callbacks->onMessageReceived(messageReinit);
  EXPECT_TRUE(pluginConnected);

  client.stop();
  EXPECT_FALSE(pluginConnected);
}

TEST(FlipperClientTests, testRemovePluginWhenConnected) {
  auto socket = new FlipperConnectionManagerMock;
  FlipperClient client(std::unique_ptr<FlipperConnectionManagerMock>{socket}, state);

  bool pluginConnected = false;
  const auto connectionCallback = [&](std::shared_ptr<FlipperConnection> conn) {
    pluginConnected = true;
  };
  const auto disconnectionCallback = [&]() { pluginConnected = false; };
  auto plugin = std::make_shared<FlipperPluginMock>("Test", connectionCallback,
                                                  disconnectionCallback);

  client.addPlugin(plugin);
  client.start();
  client.removePlugin(plugin);
  EXPECT_FALSE(pluginConnected);

  dynamic expected = dynamic::object("method", "refreshPlugins");
  EXPECT_EQ(socket->messages.back(), expected);
}

TEST(FlipperClientTests, testUnhandleableMethod) {
  auto socket = new FlipperConnectionManagerMock;
  FlipperClient client(std::unique_ptr<FlipperConnectionManagerMock>{socket}, state);

  auto plugin = std::make_shared<FlipperPluginMock>("Test");
  client.addPlugin(plugin);

  dynamic messageInit = dynamic::object("method", "init")(
      "params", dynamic::object("plugin", "Test"));
  socket->callbacks->onMessageReceived(messageInit);

  dynamic messageExecute = dynamic::object("id", 1)("method", "unexpected");
  socket->callbacks->onMessageReceived(messageExecute);

  dynamic expected = dynamic::object("id", 1)(
      "error",
      dynamic::object("message", "Received unknown method: unexpected"));
  EXPECT_EQ(socket->messages.back(), expected);
}

TEST(FlipperClientTests, testExecute) {
  auto socket = new FlipperConnectionManagerMock;
  FlipperClient client(std::unique_ptr<FlipperConnectionManagerMock>{socket}, state);
  client.start();

  const auto connectionCallback = [](std::shared_ptr<FlipperConnection> conn) {
    const auto receiver = [](const dynamic &params,
                             std::unique_ptr<FlipperResponder> responder) {
      dynamic payload = dynamic::object("message", "yes_i_hear_u");
      responder->success(payload);
    };
    conn->receive("plugin_can_u_hear_me", receiver);
  };
  auto plugin = std::make_shared<FlipperPluginMock>("Test", connectionCallback);
  client.addPlugin(plugin);

  dynamic messageInit = dynamic::object("method", "init")(
      "params", dynamic::object("plugin", "Test"));
  socket->callbacks->onMessageReceived(messageInit);

  dynamic messageUnexpected = dynamic::object("id", 1)("method", "execute")(
      "params",
      dynamic::object("api", "Test")("method", "plugin_can_u_hear_me"));
  socket->callbacks->onMessageReceived(messageUnexpected);

  dynamic expected = dynamic::object("id", 1)(
      "success", dynamic::object("message", "yes_i_hear_u"));
  EXPECT_EQ(socket->messages.back(), expected);
}

TEST(FlipperClientTests, testExecuteWithParams) {
  auto socket = new FlipperConnectionManagerMock;
  FlipperClient client(std::unique_ptr<FlipperConnectionManagerMock>{socket}, state);

  const auto connectionCallback = [&](std::shared_ptr<FlipperConnection> conn) {
    const auto receiver = [](const dynamic &params,
                             std::unique_ptr<FlipperResponder> responder) {
      const auto &first = params["first"].asString();
      const auto &second = params["second"].asString();
      std::map<std::string, std::string> m{{"dog", "woof"}, {"cat", "meow"}};
      dynamic payload = dynamic::object(first, m[first])(second, m[second]);
      responder->success(payload);
    };
    conn->receive("animal_sounds", receiver);
  };
  auto plugin = std::make_shared<FlipperPluginMock>("Test", connectionCallback);
  client.addPlugin(plugin);

  dynamic messageInit = dynamic::object("method", "init")(
      "params", dynamic::object("plugin", "Test"));
  socket->callbacks->onMessageReceived(messageInit);

  dynamic messageExecute = dynamic::object("id", 1)("method", "execute")(
      "params",
      dynamic::object("api", "Test")("method", "animal_sounds")(
          "params", dynamic::object("first", "dog")("second", "cat")));
  socket->callbacks->onMessageReceived(messageExecute);

  dynamic expected = dynamic::object("id", 1)(
      "success", dynamic::object("dog", "woof")("cat", "meow"));
  EXPECT_EQ(socket->messages.back(), expected);
}

TEST(FlipperClientTests, testExceptionUnknownPlugin) {
  auto socket = new FlipperConnectionManagerMock;
  FlipperClient client(std::unique_ptr<FlipperConnectionManagerMock>{socket}, state);
  client.start();

  dynamic messageInit = dynamic::object("method", "init")(
      "params", dynamic::object("plugin", "Unknown"));
  socket->callbacks->onMessageReceived(messageInit);

  EXPECT_EQ(socket->messages.back()["error"]["message"],
            "plugin Unknown not found for method init");
}

TEST(FlipperClientTests, testExceptionUnknownApi) {
  auto socket = new FlipperConnectionManagerMock;
  FlipperClient client(std::unique_ptr<FlipperConnectionManagerMock>{socket}, state);
  client.start();

  dynamic messageInit = dynamic::object("method", "execute")(
      "params", dynamic::object("api", "Unknown"));
  socket->callbacks->onMessageReceived(messageInit);

  EXPECT_EQ(socket->messages.back()["error"]["message"],
            "connection Unknown not found for method execute");
}

} // namespace test
} // namespace flipper
} // namespace facebook
