---
id: crash-reporter-plugin
title: Crash Reporter Setup
sidebar_label: Crash Reporter
---

## Android

```java
import com.facebook.flipper.plugins.crashreporter.CrashReporterPlugin;

client.addPlugin(CrashReporterPlugin.getInstance());
```


## iOS

<!--DOCUSAURUS_CODE_TABS-->
<!--Objective-C-->
```objectivec
#import <FlipperKitCrashReporterPlugin/FlipperKitCrashReporterPlugin.h>

[client addPlugin:[FlipperKitCrashReporterPlugin sharedInstance]];
```
<!--Swift-->
```swift
import FlipperKit

client?.add(FlipperKitCrashReporterPlugin.sharedInstance());
```
<!--END_DOCUSAURUS_CODE_TABS-->
