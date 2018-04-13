---
id: send-data
title: Sending Data to Plugins
sidebar_label: Send Data
---

It is often useful to get an instance of a sonar plugin to send data to it. Sonar makes this simple with built in support.

Plugins should be treated as singleton instances as there can only be one `SonarClient` and each `SonarClient` can only have one instance of a certain plugin. The Sonar API makes this simple by offering a way to get the current client and query it for plugins.

Plugins are identified by the string that their identifier method returns, in this example, "MySonarPlugin":

### Android

```java
final SonarClient client = AndroidSonarClient.getInstance(context);
// Client may be null if AndroidSonarClient.createInstance() was never called
// which is the case in production builds.
if (client != null) {
  final MySonarPlugin plugin = client.getPlugin("MySonarPlugin");
  plugin.sendData(myData);
}
```

### iOS

```objective-c
SonarClient *client = [SonarClient sharedClient];
MySonarPlugin *myPlugin = [client pluginWithIdentifier:@"MySonarPlugin"];
[myPlugin sendData:myData];
```

### C++

```c++
auto &client = SonarClient::instance();

// "MySonarPlugin is the return value of MySonarPlugin::identifier()
auto aPlugin = client.getPlugin("MySonarPlugin");

// aPlugin is a std::shared_ptr<SonarPlugin>. Downcast to expected type.
auto myPlugin = std::static_pointer_cast<MySonarPlugin>(aPlugin);

// Alternatively, use the templated version
myPlugin = client.getPlugin<MySonarPlugin>("MySonarPlugin");

myPlugin->sendData(myData);
```

Here, `sendData` is an example of a method that might be implemented by the sonar plugin.
