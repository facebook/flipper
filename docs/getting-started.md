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

Sonar is distributed via JCenter. Add dependencies to your `build.gradle` file.

```
repositories {
  jcenter()
}

dependencies {
  debugImplementation 'com.facebook.sonar:sonar:0.0.10'
}
```

Now you can initialize Sonar in your Application's `onCreate`-method like this:

```java
public class MyApplication extends Application {

  @Override
  public void onCreate() {
    super.onCreate();
    SoLoader.init(this, false);

    if (BuildConfig.DEBUG && SonarUtils.shouldEnableSonar(this)) {
      final SonarClient client = AndroidSonarClient.getInstance(this);
      client.addPlugin(new MySonarPlugin());
      client.start();
    }
  }
}
```

### Setup your iOS app

To integrate with an iOS app, you can use [CocoaPods](https://cocoapods.org). Add the mobile Sonar SDK and its dependencies to your `Podfile`:

```ruby
project 'MyApp.xcodeproj'
source 'https://github.com/facebook/Sonar.git'
source 'https://github.com/CocoaPods/Specs'
# Uncomment the next line to define a global platform for your project
swift_version = "4.1"

target 'MyApp' do

  pod 'SonarKit', '~>0.0.1'
  post_install do |installer|

        installer.pods_project.targets.each do |target|
            if ['YogaKit'].include? target.name
                target.build_configurations.each do |config|
                    config.build_settings['SWIFT_VERSION'] = swift_version
                end
            end
        end
    end
end
```

and install the dependencies by running `pod install`. When you open the Xcode workspace file for your app, you now can import and initialize Sonar in your AppDelegate.

```objective-c
#import <SonarKit/SonarClient.h>

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
<div class='warning'>

* We haven't released the dependency to CocoaPods yet, here is the [issue](https://github.com/facebook/Sonar/issues/132) by which you can track.
* If you do not use CocoaPods as a dependency management tool then currently there is no way to integrate SonarKit other than manually including all the dependencies and building it.
* For Android, Sonar works with both emulators and physical devices connected through USB. However on iOS, we don't yet support physical devices.
* Also Sonar doesn't work with swift projects as its written in C++ and had C++ dependencies. But we are working on supporting sonar for swift projects. You can find this issue [here](https://github.com/facebook/Sonar/issues/13)
</div>

## Ready for takeoff

Finally you need to add plugins to your Sonar client. See [Network Plugin](network-plugin.md) and [Layout Inspector Plugin](layout-plugin.md) on how to add them.
