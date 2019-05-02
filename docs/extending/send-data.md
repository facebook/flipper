---
id: send-data
title: Sending Data to Plugins
---

It is often useful to get an instance of a Flipper plugin to send data to it. Flipper makes this simple with built-in support.

Plugins should be treated as singleton instances as there can only be one `FlipperClient` and each `FlipperClient` can only have one instance of a certain plugin. The Flipper API makes this simple by offering a way to get the current client and query it for plugins.

Plugins are identified by the string that their identifier method returns, in this example, "MyFlipperPlugin":


<!--DOCUSAURUS_CODE_TABS-->
<!--Android-->
```java
final FlipperClient client = AndroidFlipperClient.getInstance(context);
// Client may be null if AndroidFlipperClient.createInstance() was never called
// which is the case in production builds.
if (client != null) {
  final MyFlipperPlugin plugin = client.getPluginByClass(MyFlipperPlugin.class);
  plugin.sendData(myData);
}
```
<!--iOS-->
```objective-c
FlipperClient *client = [FlipperClient sharedClient];
MyFlipperPlugin *myPlugin = [client pluginWithIdentifier:@"MyFlipperPlugin"];
[myPlugin sendData:myData];
```
<!--C++-->
```c++
auto &client = FlipperClient::instance();

// "MyFlipperPlugin" is the return value of MyFlipperPlugin::identifier()
auto myPlugin = client.getPlugin<MyFlipperPlugin>("MyFlipperPlugin");

myPlugin->sendData(myData);
```
```
<!--END_DOCUSAURUS_CODE_TABS-->


Here, `sendData` is an example of a method that might be implemented by the Flipper plugin.
