---
id: create-plugin
title: Mobile Setup
sidebar_label: Mobile Setup
---

## Implement FlipperPlugin

Create a class implementing `FlipperPlugin`.

### Android

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

### iOS

```objective-c
@interface MyFlipperPlugin : NSObject<FlipperPlugin>
@end

@implementation MyFlipperPlugin

- (NSString*)identifier { return @"MyFlipperPlugin"; }
- (void)didConnect:(FlipperConnection*)connection {}
- (void)didDisonnect {}
- (BOOL)runInBackground {}

@end
```

### C++

```c++
class MyFlipperPlugin : public FlipperPlugin {
public:
  std::string identifier() const override { return "MyFlipperPlugin"; }
  void didConnect(std::shared_ptr<FlipperConnection> conn) override;
  void didDisconnect() override;
  bool runInBackground() override;
};
```

## Using FlipperConnection

Using the `FlipperConnection` object you can register a receiver of a desktop method call and respond with data.

### Android

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

### iOS

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

### C++

```c++
void MyFlipperPlugin::didConnect(std::shared_ptr<FlipperConnection> conn) {
  conn->receive("getData", [](const folly::dynamic &params,
                             std::unique_ptr<FlipperResponder> responder) {
    dynamic response = folly::dynamic::object("data", getMyData());
    responder->success(response);
  });
}
```

## Push data to the desktop

You don't have to wait for the desktop to request data though, you can also push data directly to the desktop.

### Android

```java
connection.send("MyMessage",
    new FlipperObject.Builder()
        .put("message", "Hello")
        .build()
```

### iOS

```objective-c
[connection send:@"getData" withParams:@{@"message":@"hello"}];
```

### C++

```c++
void MyFlipperPlugin::didConnect(std::shared_ptr<FlipperConnection> conn) {
  dynamic message = folly::dynamic::object("message", "hello");
  conn->send("getData", message);
}
```

## Background Plugins

If the plugin returns false in `runInBackground()`, then the Flipper app will only accept messages from the client side when the plugin is active (i.e. when user is using the plugin in the Flipper app). Whereas with the plugin marked as `runInBackground`, it can send messages even when the plugin is not in active use. The benefit is that the data can be processed in the background and notifications can be fired. It also reduces the number of rerenders and time taken to display the data when the plugin becomes active. As the data comes in the background, it is processed and a state is updated in the Redux store. When the plugin becomes active, the initial render will contain all the data. Currently, the network plugin is run in background. To setup the plugin in background, follow the above steps and for the JavaScript side follow the steps given [here](background-plugin-jsside.md).
