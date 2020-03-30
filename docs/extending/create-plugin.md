---
id: create-plugin
title: Client Plugin API
---

## FlipperPlugin

To build a client plugin, implement the `FlipperPlugin` interface.

The ID that is returned from your implementation needs to match the `name` defined in your JavaScript counterpart's `package.json`.


<!--DOCUSAURUS_CODE_TABS-->
<!--Android-->
```java
public class MyFlipperPlugin implements FlipperPlugin {
  private FlipperConnection mConnection;

  @Override
  public String getId() {
    return "MyFlipperPlugin";
  }

  @Override
  public void onConnect(FlipperConnection connection) throws Exception {
    mConnection = connection;
  }

  @Override
  public void onDisconnect() throws Exception {
    mConnection = null;
  }

  @Override
  public boolean runInBackground() {
  	return false;
  }
}
```
<!--iOS-->
```objective-c
@interface MyFlipperPlugin : NSObject<FlipperPlugin>
@end

@implementation MyFlipperPlugin

- (NSString*)identifier { return @"MyFlipperPlugin"; }
- (void)didConnect:(FlipperConnection*)connection {}
- (void)didDisconnect {}
- (BOOL)runInBackground {}

@end
```
<!--C++-->
```c++
class MyFlipperPlugin : public FlipperPlugin {
public:
  std::string identifier() const override { return "MyFlipperPlugin"; }
  void didConnect(std::shared_ptr<FlipperConnection> conn) override;
  void didDisconnect() override;
  bool runInBackground() override;
};
```
<!--React Native JS-->

<div class="warning">

Please note that using Flipper from JavaScript in React Native requires the package [`react-native-flipper`](https://www.npmjs.com/package/react-native-flipper) to be installed in the hosting application.

</div>

```javascript
import {addPlugin} from 'react-native-flipper';

addPlugin({
  getId() {
    return 'MyFlipperPlugin';
  },
  onConnect(connection) {
    console.log("connected");
  },
  onDisconnect() {
    console.log("disconnected");
  },
  runInBackground() {
    return false;
  }
})
```
<!--END_DOCUSAURUS_CODE_TABS-->


## Using FlipperConnection

`onConnect` will be called when your plugin becomes active. This will provide a `FlipperConnection` allowing you to register receivers for desktop method calls and respond with data.

<!--DOCUSAURUS_CODE_TABS-->
<!--Android-->
```java
connection.receive("getData", new FlipperReceiver() {
  @Override
  public void onReceive(FlipperObject params, FlipperResponder responder) throws Exception {
    responder.success(
        new FlipperObject.Builder()
            .put("data", MyData.get())
            .build());
  }
});
```
<!--iOS-->
```objective-c
@interface MyFlipperPlugin : NSObject<FlipperPlugin>
@end

@implementation MyFlipperPlugin

- (NSString*)identifier { return @"MyFlipperPlugin"; }

- (void)didConnect:(FlipperConnection*)connection
{
  [connection receive:@"getData" withBlock:^(NSDictionary *params, FlipperResponder *responder) {
    [responder success:@{
      @"data":[MyData get],
    }];
  }];
}

- (void)didDisonnect {}

@end
```
<!--C++-->
```c++
void MyFlipperPlugin::didConnect(std::shared_ptr<FlipperConnection> conn) {
  conn->receive("getData", [](const folly::dynamic &params,
                             std::unique_ptr<FlipperResponder> responder) {
    dynamic response = folly::dynamic::object("data", getMyData());
    responder->success(response);
  });
}
```
<!--React Native JS-->
```javascript
addPlugin({
  getId() {
    return 'MyFlipperPlugin';
  },
  onConnect(connection) {
    console.log("connected");
    connection.receive("getData", (data, responder) => {
      console.log("incoming data", data);
      // respond with some data
      responder.success({
        ack: true
      });
    });
  },
  // ...as-is
})
```
<!--END_DOCUSAURUS_CODE_TABS-->

## Push data to the desktop

You don't have to wait for the desktop to request data though, you can also push data directly to the desktop. If the JS plugin subscribes to the same method, it will receive the data.

<!--DOCUSAURUS_CODE_TABS-->
<!--Android-->
```java
connection.send("MyMessage",
    new FlipperObject.Builder()
        .put("message", "Hello")
        .build()
```
<!--iOS-->
```objective-c
[connection send:@"getData" withParams:@{@"message":@"hello"}];
```
<!--C++-->
```c++
void MyFlipperPlugin::didConnect(std::shared_ptr<FlipperConnection> conn) {
  dynamic message = folly::dynamic::object("message", "hello");
  conn->send("getData", message);
}
```
<!--React Native JS-->
```javascript
addPlugin({
  getId() {
    return 'MyFlipperPlugin';
  },
  onConnect(connection) {
    console.log("connected");
    connection.send("newRow", { message: "Hello" });
  },
  // ...as-is
})
```
<!--END_DOCUSAURUS_CODE_TABS-->

## Background Plugins

In some cases you may want to provide data to Flipper even when your plugin is not currently active. Returning true in `runInBackground()` will result in `onConnect` being called as soon as Flipper connects, and allow you to use the connection at any time. See the [Client Plugin Lifecycle](client-plugin-lifecycle) for more details.

This should be used in combination with a `persistedStateReducer` on the desktop side. See the [JS Plugin API](js-plugin-api#background-plugins) for details.

The benefit is that the desktop plugin can process this data in the background and fire notifications. It also reduces the number of renders and time taken to display the data when the plugin becomes active.

<div class="warning">

Please note that a background plugin could keep some data in memory until a Flipper connection is available, for example to keep statistics about the app startup process.
However, a plugin shouldn't assume it will eventually get a connection, since this depends on whether the user has enabled the plugin on the Desktop side.
So make sure to not store unbounded amounts of data!

</div>
