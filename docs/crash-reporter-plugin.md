---
id: crash-reporter-plugin
title: Crash Reporter Plugin
---

The Crash Reporter Plugin shows a notification in Flipper whenever an app crashes. You can click on the notification to see crash information like stacktrace and other metadata. For Android, you can also use the "Open in Logs" action to find the relevant point in the logs view, so that it is easy to investigate what had happened before the crash.

Since this is an alpha release, it doesn't fire notification on all kind of crashes. It fires notifications on uncaught exceptions for both Android and iOS applications, whereas it fires crash notification for signal errors just for iOS and currently not for Android. We are still working on it, but do try out this plugin. Feedback and issues are welcome!

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

