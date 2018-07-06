---
id: network-plugin
title: Network
---

Use the Network inspector to inspect outgoing network traffic our apps. You can easily browse all requests being made and their responses. The plugin also supports gzipped responses.

![Network plugin](/docs/assets/network.png)

## Setup

To use the network plugin, you need to add the plugin to your Sonar client instance.

### Android

```java
import com.facebook.sonar.plugins.network.NetworkSonarPlugin;

client.addPlugin(new NetworkSonarPlugin());
```

### iOS

```objective-c
#import <SonarKitNetworkPlugin/SonarKitNetworkPlugin.h>

[client addPlugin: [SonarKitNetworkPlugin new]]
```

## Usage

All request sent from the device will be listed in the plugin. Click on a request to see details like headers and body. You can filter the table for domain, method or status by clicking on the corresponding value in the table.
