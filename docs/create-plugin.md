---
id: create-plugin
title: Mobile Setup
sidebar_label: Mobile Setup
---

## Implement SonarPlugin

Create a class implementing `SonarPlugin`.

### Android

```java
public class MySonarPlugin implements SonarPlugin {
  private SonarConnection mConnection;

  @Override
  public String getId() {
    return "MySonarPlugin";
  }

  @Override
  public void onConnect(SonarConnection connection) throws Exception {
    mConnection = connection;
  }

  @Override
  public void onDisconnect() throws Exception {
    mConnection = null;
  }
}
```

### iOS

```objective-c
@interface MySonarPlugin : NSObject<SonarPlugin>
@end

@implementation MySonarPlugin

- (NSString*)identifier { return @"MySonarPlugin"; }
- (void)didConnect:(SonarConnection*)connection {}
- (void)didDisonnect {}

@end
```

### C++

```c++
class MySonarPlugin : public SonarPlugin {
public:
  std::string identifier() const override { return "MySonarPlugin"; }
  void didConnect(std::shared_ptr<SonarConnection> conn) override;
  void didDisconnect() override;
};
```

## Using SonarConnection

Using the `SonarConnection` object you can register a receiver of a desktop method call and respond with data.

### Android

```java
connection.receive("getData", new SonarReceiver() {
  @Override
  public void onReceive(SonarObject params, SonarResponder responder) throws Exception {
    responder.success(
        new SonarObject.Builder()
            .put("data", MyData.get())
            .build());
  }
});
```

### iOS

```objective-c
@interface MySonarPlugin : NSObject<SonarPlugin>
@end

@implementation MySonarPlugin

- (NSString*)identifier { return @"MySonarPlugin"; }

- (void)didConnect:(SonarConnection*)connection
{
  [connection receive:@"getData" withBlock:^(NSDictionary *params, SonarResponder *responder) {
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
void MySonarPlugin::didConnect(std::shared_ptr<SonarConnection> conn) {
  conn->receive("getData", [](const folly::dynamic &params,
                             std::unique_ptr<SonarResponder> responder) {
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
    new SonarObject.Builder()
        .put("message", "Hello")
        .build()
```

### iOS

```objective-c
[connection send:@"getData" withParams:@{@"message":@"hello"}];
```

### C++

```c++
void MySonarPlugin::didConnect(std::shared_ptr<SonarConnection> conn) {
  dynamic message = folly::dynamic::object("message", "hello");
  conn->send("getData", message);
}
```
