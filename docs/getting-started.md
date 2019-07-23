---
id: getting-started
title: Getting Started
---

Flipper helps you debug Android and iOS apps running in an emulator/simulator or connected physical development devices. Flipper consists of two parts:

- The desktop app for macOS
- The native mobile SDKs for Android and iOS

To use Flipper, you need to add the mobile SDK to your app.

## Setup

### Desktop app

The desktop part of Flipper doesn't need any particular setup. Simply [download the latest build](https://www.facebook.com/fbflipper/public/mac) of our app and launch it. The desktop app is available for macOS and requires a working installation of the Android/iOS development tools on your system.

Once you start Flipper and launch an emulator/simulator or connect a device, you will already be able to see the device logs in Flipper. To see app specific data, you need to integrate our native SDKs with your app.

![Logs plugin](/docs/assets/initial.png)

### Setup your Android app

Add the following permissions to your `AndroidManifest.xml`. The SDK needs these to communicate with the desktop app on localhost via adb. It won't make any external internet requests.

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
```

It's recommended that you add the following activity to the manifest too, which can help diagnose integration issues and other problems:

```xml
<activity android:name="com.facebook.flipper.android.diagnostics.FlipperDiagnosticActivity"
        android:exported="true"/>
```

Flipper is distributed via JCenter. Add the dependencies to your `build.gradle` file.
You should also explicitly depend on [`soloader`](https://github.com/facebook/soloader)
instead of relying on transitive dependency resolution which is getting deprecated
with Gradle 5.

We provide a "no-op" implementation of some oft-used Flipper interfaces you can
use to make it easier to strip Flipper from your release builds.

```groovy
repositories {
  jcenter()
}

dependencies {
  debugImplementation 'com.facebook.flipper:flipper:0.23.2'
  debugImplementation 'com.facebook.soloader:soloader:0.5.1'

  releaseImplementation 'com.facebook.flipper:flipper-noop:0.23.2'
}
```

Now you can initialize Flipper in your Application's `onCreate` method, which involves
initializing SoLoader (for loading the C++ part of Flipper) and starting a `FlipperClient`.

```java
public class MyApplication extends Application {

  @Override
  public void onCreate() {
    super.onCreate();
    SoLoader.init(this, false);

    if (BuildConfig.DEBUG && FlipperUtils.shouldEnableFlipper(this)) {
      final FlipperClient client = AndroidFlipperClient.getInstance(this);
      client.addPlugin(new InspectorFlipperPlugin(this, DescriptorMapping.withDefaults()));
      client.start();
    }
  }
}
```

### Android Snapshots

Feeling adventurous? We publish Android snapshot releases directly off of `master`.

You can get the latest version by adding the Maven Snapshot repository to your sources
and pointing to the most recent `-SNAPSHOT` version.

```groovy
repositories {
  maven { url 'https://oss.sonatype.org/content/repositories/snapshots/' }
}

dependencies {
  debugImplementation 'com.facebook.flipper:flipper:0.23.3-SNAPSHOT'
  debugImplementation 'com.facebook.soloader:soloader:0.5.1'

  releaseImplementation 'com.facebook.flipper:flipper-noop:0.23.3-SNAPSHOT'
}
```

## Setup your iOS app

We support both Swift and Objective-C for Flipper with CocoaPods as build and distribution mechanism.

### CocoaPods

<!--DOCUSAURUS_CODE_TABS-->
<!--Objective-C-->
```ruby
project 'MyApp.xcodeproj'
swift_version = "4.1"
flipperkit_version = '0.23.2'

target 'MyApp' do
  platform :ios, '9.0'

  pod 'FlipperKit', '~>' + flipperkit_version
  pod 'FlipperKit/FlipperKitLayoutComponentKitSupport', '~>' + flipperkit_version
  pod 'FlipperKit/SKIOSNetworkPlugin', '~>' + flipperkit_version
  pod 'FlipperKit/FlipperKitUserDefaultsPlugin', '~>' + flipperkit_version
  # This post_install hook adds the -DFB_SONARKIT_ENABLED=1 flag to OTHER_CFLAGS, necessary to expose Flipper classes in the header files
  post_install do |installer|
    file_name = Dir.glob("*.xcodeproj")[0]
    app_project = Xcodeproj::Project.open(file_name)
    app_project.native_targets.each do |target|
      target.build_configurations.each do |config|
        cflags = config.build_settings['OTHER_CFLAGS'] || '$(inherited) '
        unless cflags.include? '-DFB_SONARKIT_ENABLED=1'
          puts 'Adding -DFB_SONARKIT_ENABLED=1 in OTHER_CFLAGS...'
          cflags << '-DFB_SONARKIT_ENABLED=1'
        end
        config.build_settings['OTHER_CFLAGS'] = cflags
      end
      app_project.save
    end
    installer.pods_project.save
   end
end
```
<!--Swift-->
```ruby
project 'MyApp.xcodeproj'
swift_version = "4.1"
flipperkit_version = '0.23.2'

target 'MyApp' do
  platform :ios, '9.0'

  pod 'FlipperKit', '~>' + flipperkit_version
  # Layout and network plugins are not yet supported for swift projects
  pod 'FlipperKit/FlipperKitLayoutComponentKitSupport', '~>' + flipperkit_version
  pod 'FlipperKit/SKIOSNetworkPlugin', '~>' + flipperkit_version
  pod 'FlipperKit/FlipperKitUserDefaultsPlugin', '~>' + flipperkit_version

  # If you use `use_frameworks!` in your Podfile,
  # uncomment the below $static_framework array and also
  # the pre_install section.  This will cause Flipper and
  # it's dependencies to be static and all other pods to
  # be dynamic.

  # $static_framework = ['FlipperKit', 'Flipper', 'Flipper-Folly',
  #   'CocoaAsyncSocket', 'ComponentKit', 'DoubleConversion',
  #   'glog', 'Flipper-PeerTalk', 'Flipper-RSocket', 'Yoga', 'YogaKit',
  #   'CocoaLibEvent', 'OpenSSL-Static', 'boost-for-react-native']
  #
  # pre_install do |installer|
  #   Pod::Installer::Xcode::TargetValidator.send(:define_method, :verify_no_static_framework_transitive_dependencies) {}
  #   installer.pod_targets.each do |pod|
  #     if $static_framework.include?(pod.name)
  #       pod.instance_variable_set(:@host_requires_frameworks, false)
  #     end
  #   end
  # end


  # This post_install hook adds the -DFB_SONARKIT_ENABLED flag to OTHER_SWIFT_FLAGS, necessary to build swift target
  post_install do |installer|
    file_name = Dir.glob("*.xcodeproj")[0]
    app_project = Xcodeproj::Project.open(file_name)
    app_project.native_targets.each do |target|
        target.build_configurations.each do |config|
          if (config.build_settings['OTHER_SWIFT_FLAGS'])
            unless config.build_settings['OTHER_SWIFT_FLAGS'].include? '-DFB_SONARKIT_ENABLED'
              puts 'Adding -DFB_SONARKIT_ENABLED ...'
              swift_flags = config.build_settings['OTHER_SWIFT_FLAGS']
              if swift_flags.split.last != '-Xcc'
                config.build_settings['OTHER_SWIFT_FLAGS'] << ' -Xcc'
              end
              config.build_settings['OTHER_SWIFT_FLAGS'] << ' -DFB_SONARKIT_ENABLED'
            end
          else
            puts 'OTHER_SWIFT_FLAGS does not exist thus assigning it to `$(inherited) -Xcc -DFB_SONARKIT_ENABLED`'
            config.build_settings['OTHER_SWIFT_FLAGS'] = '$(inherited) -Xcc -DFB_SONARKIT_ENABLED'
          end
          app_project.save
        end
      end
      installer.pods_project.save
  end
end
```
<!--END_DOCUSAURUS_CODE_TABS-->

You need to compile your project with the `FB_SONARKIT_ENABLED=1` compiler flag. The above `post_install` hook adds this compiler flag to your project settings.

<div class="warning">

On the first run of `pod install`, `FB_SONARKIT_ENABLED=1` may not be added in the "Build Settings" of your project, but in all the subsequent runs of `pod install`, the above `post_install` hook successfully adds the compiler flag. So before running your app, make sure that `FB_SONARKIT_ENABLED=1` is present in `OTHER_CFLAGS` and `OTHER_SWIFT_FLAGS` for Objective-C and Swift projects respectively.
</div>

Install the dependencies by running `pod install`. You can now import and initialize Flipper in your
AppDelegate.

<!--DOCUSAURUS_CODE_TABS-->

<!--Objective-C-->
```objective-c
#import <FlipperKit/FlipperClient.h>
#import <FlipperKitLayoutPlugin/FlipperKitLayoutPlugin.h>
#import <FlipperKitLayoutComponentKitSupport/FlipperKitLayoutComponentKitSupport.h>
#import <FlipperKitUserDefaultsPlugin/FKUserDefaultsPlugin.h>
#import <FlipperKitNetworkPlugin/FlipperKitNetworkPlugin.h>
#import <SKIOSNetworkPlugin/SKIOSNetworkAdapter.h>

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  FlipperClient *client = [FlipperClient sharedClient];
  SKDescriptorMapper *layoutDescriptorMapper = [[SKDescriptorMapper alloc] initWithDefaults];
  [FlipperKitLayoutComponentKitSupport setUpWithDescriptorMapper: layoutDescriptorMapper];
  [client addPlugin: [[FlipperKitLayoutPlugin alloc] initWithRootNode: application
                                                 withDescriptorMapper: layoutDescriptorMapper]];

  [client addPlugin:[[FKUserDefaultsPlugin alloc] initWithSuiteName:nil]];  [client start];
  [client addPlugin: [[FlipperKitNetworkPlugin alloc] initWithNetworkAdapter:[SKIOSNetworkAdapter new]]];
  [client start];
  ...
}
@end
```
<!--Swift-->
```swift
import UIKit
import FlipperKit
@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

  var window: UIWindow?


  func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    // Override point for customization after application launch.
    let client = FlipperClient.shared()
    let layoutDescriptorMapper = SKDescriptorMapper(defaults: ())
    FlipperKitLayoutComponentKitSupport.setUpWith(layoutDescriptorMapper)
    client?.add(FlipperKitLayoutPlugin(rootNode: application, with: layoutDescriptorMapper!))
    client?.start()
    return true
  }
}
```
<!--END_DOCUSAURUS_CODE_TABS-->

<div class="warning">

- If you do not use CocoaPods as a dependency management tool then currently there is no way to integrate FlipperKit other than manually including all the dependencies and building it.
- For Android, Flipper works with both emulators and physical devices connected through USB. However on iOS, we don't yet support physical devices.

</div>

## Ready for takeoff

Finally, you need to add plugins to your Flipper client. Above we have only added the Layout Inspector plugin to get you started. See [Network Plugin](setup/network-plugin.md) and [Layout Inspector Plugin](setup/layout-plugin.md) for information on how to add them, and also enable Litho or ComponentKit support. You can check the sample apps in the [GitHub repo](https://github.com/facebook/flipper) for examples of integrating other plugins.

## Having trouble?

See the [troubleshooting page](troubleshooting.html) for help with known problems.
