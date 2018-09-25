---
id: leak-canary-plugin
title: LeakCanary
---

The LeakCanary plugin provides developers with Flipper support for [LeakCanary](https://github.com/square/leakcanary), an open source memory leak detection library.

## Setup

Note: this plugin is only available for Android.

### Android

First, add the plugin to your Flipper client instance:
```java
import com.facebook.flipper.plugins.leakcanary.LeakCanaryFlipperPlugin;

client.addPlugin(new LeakCanaryFlipperPlugin());
```

Next, build a custom RefWatcher using RecordLeakService: (see [LeakCanary docs](https://github.com/square/leakcanary/wiki/Customizing-LeakCanary#uploading-to-a-server) for more information on RefWatcher)
```java
import com.facebook.flipper.plugins.leakcanary.RecordLeakService;

RefWatcher refWatcher = LeakCanary.refWatcher(this)
    .listenerServiceClass(RecordLeakService.class);
    .buildAndInstall();
```

## Usage

Leaks detected by LeakCanary will appear automatically in Flipper. Each leak will display a hierarchy of objects, beginning from the garbage collector root and ending at the leaked class.
Selecting any object in this list will display contents of the object's various fields.
