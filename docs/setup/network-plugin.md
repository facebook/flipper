---
id: network-plugin
title: Network Setup
sidebar_label: Network
---

To use the network plugin, you need to add the plugin to your Flipper client instance.

## Android

```java
import com.facebook.flipper.plugins.network.NetworkFlipperPlugin;

NetworkFlipperPlugin networkFlipperPlugin = new NetworkFlipperPlugin();
client.addPlugin(networkFlipperPlugin);
```

### OkHttp Integration

If you are using the popular OkHttp library, you can use the Interceptors system to automatically hook into your existing stack.

```java
import com.facebook.flipper.plugins.network.FlipperOkhttpInterceptor;

new OkHttpClient.Builder()
    .addNetworkInterceptor(new FlipperOkhttpInterceptor(networkFlipperPlugin))
    .build();
```

As interceptors can modify the request and response, add the Flipper interceptor after all others to get an accurate view of the network traffic.

## iOS

```objective-c
#import <FlipperKitNetworkPlugin/FlipperKitNetworkPlugin.h>

[client addPlugin: [FlipperKitNetworkPlugin new]]
```
