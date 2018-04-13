---
id: getting-started
title: Getting Started
sidebar_label: Getting Started
---

Sonar helps you debug Android and iOS apps running in an emulator/simulator or connected physical development devices. Sonar consists of two parts:

* The desktop app for macOS
* The native mobile SDKs for Android and iOS

To use Sonar, you need to add the mobile SDK to your app.

## Setup

### Desktop app

The desktop part of Sonar doesn't need any particular setup. Simply [download the latest build](https://www.facebook.com/sonar/public/mac) of our app and launch it. The desktop app is available for macOS and requires a working installation of the Android/iOS development tools on your system.

Once you start Sonar and launch an emulator/simulator or connect a device, you will already be able to see the device logs in Sonar. To see app specific data, you need to integrate our native SDKs with your app.

![Logs plugin](/docs/assets/initial.png)

### Setup your Android app

TODO: Install dependencies

TODO: Add dependencies to your `build.gradle` file.

Now you can initialize Sonar in your Application's `onCreate`-method like this:

```java
public class MyApplication extends Application {

  @Override
  public void onCreate() {
    super.onCreate();

    if (BuildConfig.DEBUG && SonarUtils.isMainProcess(mApplicationContext)) {
      final SonarClient client = AndroidSonarClient.getInstance(this);
      client.addPlugin(new MySonarPlugin());
      client.start();
    }
  }
}
```

### Setup your iOS app

To integrate with our iOS app, you can use [CocoaPods](https://cocoapods.org). Add the mobile Sonar SDK to your `Podfile`:

```ruby
platform :ios, '8.0'
use_frameworks!

target 'MyApp' do
  pod 'Sonar', '~> 1.0'
end
```

and install the dependencies by running `pod install`. When you open the Xcode workspace file for your app, you now can import and initialize Sonar in your AppDelegate.

```objective-c
#import <Sonar/SonarClient.h>

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
#if DEBUG
  SonarClient *client = [SonarClient sharedClient];
  [client addPlugin:[MySonarPlugin new]];
  [client start];
#endif
  ...
}
@end
```

## Ready for takeoff

Finally you need to add plugins to your Sonar client. See [Network Plugin](network-plugin.md) and [Layout Inspector Plugin](layout-plugin.md) on how to add them.
