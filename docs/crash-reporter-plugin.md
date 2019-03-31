---
id: crash-reporter-plugin
title: Crash Reporter Plugin
---

The Crash Reporter Plugin shows a notification in Flipper whenever an app crashes. You can click on the notification to see crash information like stacktrace and other metadata. For Android, you can click the "Open in Logs" button to jump to the row in the Logs plugin with the crash information.

It also shows the list of crashes in the form of a dropdown. You can easily navigate the crashes using previous and next buttons in the UI.

The plugin looks like the following

![UI](/docs/assets/crashreporterplugin.png)

![Notification](/docs/assets/crashreporterpluginnotification.png)

## Setup

### iOS

Add crash reporter plugin to the client.

#### Objective-C

```objectivec
#import <FlipperKitCrashReporterPlugin/FlipperKitCrashReporterPlugin.h>

[client addPlugin:[FlipperKitCrashReporterPlugin sharedInstance]];

```

#### Swift

```swift
import FlipperKit

client?.add(FlipperKitCrashReporterPlugin.sharedInstance());

```

### Android

Add crash reporter plugin to the client.

```java
import com.facebook.flipper.plugins.crashreporter.CrashReporterPlugin;

client.addPlugin(CrashReporterPlugin.getInstance());

```
