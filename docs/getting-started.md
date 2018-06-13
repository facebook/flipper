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
  debugImplementation 'com.facebook.sonar:sonar:0.0.1'
}
```

Now you can initialize Sonar in your Application's `onCreate`-method like this:

```java
public class MyApplication extends Application {

  @Override
  public void onCreate() {
    super.onCreate();
    SoLoader.init(this, 0);

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
platform :ios, '8.0'
swift_version = '4.1'

target 'MyApp' do

  pod 'RSocket', :podspec => 'https://raw.githubusercontent.com/facebook/Sonar/master/iOS/third-party-podspecs/RSocket.podspec?token=ADr9NE_I05Vu8g7oq_g6g_9FLx784NFmks5bJ5LvwA%3D%3D'
  pod 'DoubleConversion', :podspec => 'https://raw.githubusercontent.com/facebook/Sonar/master/iOS/third-party-podspecs/DoubleConversion.podspec?token=ADr9NOxtIEmr5ODP9PWq6-sht-Ye6UYGks5bJ5MjwA%3D%3D'
  pod 'glog', :podspec => 'https://raw.githubusercontent.com/facebook/Sonar/master/iOS/third-party-podspecs/glog.podspec?token=ADr9NBHbrlbkFR3DQTPzj0CnZdria4jvks5bJ5M3wA%3D%3D'
  pod 'Folly', :podspec => 'https://raw.githubusercontent.com/facebook/Sonar/master/iOS/third-party-podspecs/Folly.podspec?token=ADr9NNTjwJ8xqLFwc3Qz3xB3GsCk-Esmks5bJ5NGwA%3D%3D'
  pod 'PeerTalk', :podspec => 'https://raw.githubusercontent.com/facebook/Sonar/master/iOS/third-party-podspecs/PeerTalk.podspec?token=ADr9NB8frQTrUWytsMXtdv_P8km7jV_Mks5bJ5NbwA%3D%3D'
  pod 'Yoga','~>1.8.1', :modular_headers => true
  pod 'Sonar', :podspec => 'https://raw.githubusercontent.com/facebook/Sonar/master/xplat/Sonar/Sonar.podspec?token=ADr9NFO7byH9uAuhGAIEYuoJeBNyBxf6ks5bJ5N8wA%3D%3D'
  pod 'SonarKit', :podspec => 'https://raw.githubusercontent.com/facebook/Sonar/master/SonarKit.podspec?token=ADr9NBuYoodM_NeysQg899hkxXw0WZ7Xks5bJ5OVwA%3D%3D'
  pod 'SonarKit/SonarKitLayoutComponentKitSupport', :podspec => 'https://raw.githubusercontent.com/facebook/Sonar/master/SonarKit.podspec?token=ADr9NBuYoodM_NeysQg899hkxXw0WZ7Xks5bJ5OVwA%3D%3D'
  pod 'SonarKit/SKIOSNetworkPlugin', :podspec => 'https://raw.githubusercontent.com/facebook/Sonar/master/SonarKit.podspec?token=ADr9NBuYoodM_NeysQg899hkxXw0WZ7Xks5bJ5OVwA%3D%3D'
  pod 'ComponentKit', :podspec => 'https://raw.githubusercontent.com/facebook/Sonar/master/iOS/third-party-podspecs/ComponentKit.podspec?token=ADr9NNV9gqkpFTUKaHpCiYOZIG3Ev-Hyks5bJ5O-wA%3D%3D'
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

* We haven't released the dependency to CocoaPods, because we weren't able to successfully validate the podspec of SonarKit. You could help us out by fixing this [issue](https://github.com/facebook/Sonar/issues/11) by submitting a PR to the repo.
* If you do not use CocoaPods as a dependency management tool then currently there is no way to integrate SonarKit other than manually including all the dependencies and building it.
* Also Sonar doesn't work with swift projects as its written in C++ and had C++ dependencies. But we are working on supporting sonar for swift projects. You can find this issue [here](https://github.com/facebook/Sonar/issues/13)
</div>

## Ready for takeoff

Finally you need to add plugins to your Sonar client. See [Network Plugin](network-plugin.md) and [Layout Inspector Plugin](layout-plugin.md) on how to add them.
