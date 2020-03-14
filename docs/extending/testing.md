---
id: testing
title: Testing
---

Developer tools are only used if they work. We have built APIs to test plugins.

## Android

Start by creating your first test file in this directory `MyFlipperPluginTest.java`. In the test method body we create our plugin which we want to test as well as a `FlipperConnectionMock`. In this contrived example we simply assert that our plugin's connected status is what we expect.

```java
@RunWith(RobolectricTestRunner.class)
public class MyFlipperPluginTest {

  @Test
  public void myTest() {
    final MyFlipperPlugin plugin = new MyFlipperPlugin();
    final FlipperConnectionMock connection = new FlipperConnectionMock();

    plugin.onConnect(connection);
    assertThat(plugin.connected(), equalTo(true));
  }
}
```

There are two mock classes that are used to construct tests `FlipperConnectionMock` and `FlipperResponderMock`. Together these can be used to write very powerful tests to verify the end to end behavior of your plugin. For example we can test if for a given incoming message our plugin responds as we expect.

```java
@Test
public void myTest() {
  final MyFlipperPlugin plugin = new MyFlipperPlugin();
  final FlipperConnectionMock connection = new FlipperConnectionMock();
  final FlipperResponderMock responder = new FlipperResponderMock();

  plugin.onConnect(connection);

  final FlipperObject params = new FlipperObject.Builder()
      .put("phrase", "flipper")
      .build();
  connection.receivers.get("myMethod").onReceive(params, responder);

  assertThat(responder.successes, hasItem(
      new FlipperObject.Builder()
          .put("phrase", "ranos")
          .build()));
}
```

## C++

Start by creating your first test file in this directory `MyFlipperPluginTests.cpp` and import the testing utilities from `fbsource//xplat/sonar/xplat:FlipperTestLib`. These utilities mock out core pieces of the communication channel so that you can test your plugin in isolation.

```
#include <MyFlipperPlugin/MyFlipperPlugin.h>
#include <FlipperTestLib/FlipperConnectionMock.h>
#include <FlipperTestLib/FlipperResponderMock.h>

#include <folly/json.h>
#include <gtest/gtest.h>

namespace facebook {
namespace flipper {
namespace test {

TEST(MyFlipperPluginTests, testDummy) {
  EXPECT_EQ(1 + 1, 2);
}

} // namespace test
} // namespace flipper
} // namespace facebook
```

Here is a simple test using these mock utilities to create a plugin, send some data, and assert that the result is as expected.

```
TEST(MyFlipperPluginTests, testDummy) {
  std::vector<folly::dynamic> successfulResponses;
  auto responder = std::make_unique<FlipperResponderMock>(&successfulResponses);
  auto conn = std::make_shared<FlipperConnectionMock>();

  MyFlipperPlugin plugin;
  plugin.didConnect(conn);

  folly::dynamic message = folly::dynamic::object("param1", "hello");
  folly::dynamic expectedResponse = folly::dynamic::object("response", "Hi there");

  auto receiver = conn->receivers_["someMethod"];
  receiver(message, std::move(responder));

  EXPECT_EQ(successfulResponses.size(), 1);
  EXPECT_EQ(successfulResponses.back(), expectedResponse);
}
```

## Testing the Flipper Desktop Plugin

Tests should be put in the `__tests__` directory of your plugin sources, and be created using Jest.
An example test suite can be found [here](https://github.com/facebook/flipper/blob/master/desktop/plugins/layout/__tests__/ProxyArchiveClient.node.tsx).

Flipper exposes an API to generate unit tests that can verify _regressions_ and real life scenarios.
To generate a unit test:

1. Start flipper.
2. Open your plugin.
3. Open the Developer Tools (`View > Open Developer Tools`).
4. In the console, call the function `flipperStartPluginRecording()`.
5. Interact with your application, in such a way that new events are created for your plugin.
6. Once you generated an interesting amount and diversity of events, call `flipperStopPluginRecording()` from the Flipper console.
7. This process will have generated a unit test and a snapshot file with the data (the console will report where). Move those files to your `__tests__` directory.
8. The unit test should succeed if it is run using Jest. Feel free to modify the unit test to your needs. In the future you might want to record new snapshot data files if the plugin changes.
