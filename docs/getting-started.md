---
id: getting-started
title: Getting Started
---

Flipper helps you debug Android and iOS apps running in an emulator/simulator or connected physical development devices. Flipper consists of two parts:

- The desktop app
- The native mobile SDKs for Android and iOS

To use Flipper, you need to add the mobile SDK to your app. If you are using React Native 0.62 or higher, this is largely done automatically for you.

## Setup

### Desktop app

The desktop part of Flipper doesn't need any particular setup. Simply download the latest build for [Mac](https://www.facebook.com/fbflipper/public/mac), [Linux](https://www.facebook.com/fbflipper/public/linux) or [Windows](https://www.facebook.com/fbflipper/public/windows) and launch it. In order to work properly, Flipper requires a working installation of the Android and (if where applicable) iOS development tools on your system, as well as the [OpenSSL](https://www.openssl.org) binary on your `$PATH`.

Once you start Flipper and launch an emulator/simulator or connect a device, you will already be able to see the device logs in Flipper. To see app specific data, you need to integrate our native SDKs with your app.

![Logs plugin](/docs/assets/initial.png)

## Setup your Android app

It's recommended that you add the following activity to the manifest, which can help diagnose integration issues and other problems:

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
  debugImplementation 'com.facebook.flipper:flipper:0.35.0'
  debugImplementation 'com.facebook.soloader:soloader:0.8.2'

  releaseImplementation 'com.facebook.flipper:flipper-noop:0.35.0'
}
```

<div class="warning">

Please note that our `flipper-noop` package provides a limited subset of the
APIs provided by the `flipper` package and does not provide any plugin stubs.
It is recommended that you keep all Flipper instantiation code in a separate
build variant to ensure it doesn't accidentally make it into your production
builds. Check out [the sample
app](https://github.com/facebook/flipper/tree/master/android/sample/src) to
see how to organise your Flipper initialization into debug and release
variants.

Alternatively, have a look at the third-party
[flipper-android-no-op](https://github.com/theGlenn/flipper-android-no-op)
repository, which provides empty implementations for several Flipper plugins.

</div>

Now you can initialize Flipper in your Application's `onCreate` method, which involves
initializing SoLoader (for loading the C++ part of Flipper) and starting a `FlipperClient`.

```java
import com.facebook.flipper.android.AndroidFlipperClient;
import com.facebook.flipper.android.utils.FlipperUtils;
import com.facebook.flipper.core.FlipperClient;

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
  debugImplementation 'com.facebook.flipper:flipper:0.35.1-SNAPSHOT'
  debugImplementation 'com.facebook.soloader:soloader:0.8.2'

  releaseImplementation 'com.facebook.flipper:flipper-noop:0.35.1-SNAPSHOT'
}
```

## Setup your iOS app

We support both Swift and Objective-C for Flipper with CocoaPods as build and distribution mechanism. For CocoaPods 1.9+ following is the configuration.

### CocoaPods

<!--DOCUSAURUS_CODE_TABS-->
<!--Objective-C-->

```ruby
project 'MyApp.xcodeproj'
flipperkit_version = '0.35.0'

target 'MyApp' do
  platform :ios, '9.0'
  # use_framework!
  pod 'FlipperKit', '~>' + flipperkit_version
  pod 'FlipperKit/FlipperKitLayoutComponentKitSupport', '~>' + flipperkit_version
  pod 'FlipperKit/SKIOSNetworkPlugin', '~>' + flipperkit_version
  pod 'FlipperKit/FlipperKitUserDefaultsPlugin', '~>' + flipperkit_version

  # If you use `use_frameworks!` in your Podfile,
  # uncomment the below $static_framework array and also
  # the pre_install section.  This will cause Flipper and
  # it's dependencies to be built as a static library and all other pods to
  # be dynamic.
  # $static_framework = ['FlipperKit', 'Flipper', 'Flipper-Folly',
  #   'CocoaAsyncSocket', 'ComponentKit', 'Flipper-DoubleConversion',
  #   'Flipper-Glog', 'Flipper-PeerTalk', 'Flipper-RSocket', 'Yoga', 'YogaKit',
  #   'CocoaLibEvent', 'OpenSSL-Universal', 'boost-for-react-native']
  #
  # pre_install do |installer|
  #   Pod::Installer::Xcode::TargetValidator.send(:define_method, :verify_no_static_framework_transitive_dependencies) {}
  #   installer.pod_targets.each do |pod|
  #       if $static_framework.include?(pod.name)
  #         def pod.build_type;
  #           Pod::BuildType.static_library
  #         end
  #       end
  #     end
  # end

  # This post_install hook adds the -DFB_SONARKIT_ENABLED=1 flag to OTHER_CFLAGS, necessary to expose Flipper classes in the header files
  post_install do |installer|
    installer.pods_project.targets.each do |target|
      if target.name == 'YogaKit'
        target.build_configurations.each do |config|
          config.build_settings['SWIFT_VERSION'] = '4.1'
        end
      end
    end
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
flipperkit_version = '0.35.0'

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
  # it's dependencies to be built as a static library and all other pods to
  # be dynamic.
  # $static_framework = ['FlipperKit', 'Flipper', 'Flipper-Folly',
  #   'CocoaAsyncSocket', 'ComponentKit', 'Flipper-DoubleConversion',
  #   'Flipper-Glog', 'Flipper-PeerTalk', 'Flipper-RSocket', 'Yoga', 'YogaKit',
  #   'CocoaLibEvent', 'OpenSSL-Universal', 'boost-for-react-native']
  #
  # pre_install do |installer|
  #   Pod::Installer::Xcode::TargetValidator.send(:define_method, :verify_no_static_framework_transitive_dependencies) {}
  #   installer.pod_targets.each do |pod|
  #       if $static_framework.include?(pod.name)
  #         def pod.build_type;
  #           Pod::BuildType.static_library
  #         end
  #       end
  #     end
  # end


  # This post_install hook adds the -DFB_SONARKIT_ENABLED flag to OTHER_SWIFT_FLAGS, necessary to build swift target
  post_install do |installer|
    installer.pods_project.targets.each do |target|
      if target.name == 'YogaKit'
        target.build_configurations.each do |config|
          config.build_settings['SWIFT_VERSION'] = '4.1'
        end
      end
    end
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

### For pure Objective-C projects

For pure Objective-C projects, add the following things in your settings:

1. `/usr/lib/swift` as the first entry of the `LD_RUNPATH_SEARCH_PATHS`
2. Add the following in `LIBRARY_SEARCH_PATHS`

```
					"\"$(TOOLCHAIN_DIR)/usr/lib/swift/$(PLATFORM_NAME)\"",
					"\"$(TOOLCHAIN_DIR)/usr/lib/swift-5.0/$(PLATFORM_NAME)\"",	
```
3. If after the above two steps there are still error's like `Undefined symbol _swift_getFunctionReplacement` then set `DEAD_CODE_STRIPPING` to `YES`. Reference for this fix is [here](https://forums.swift.org/t/undefined-symbol-swift-getfunctionreplacement/30495/4)

This is done to overcome a bug with Xcode 11 which fails to compile swift code when bitcode is enabled. Flipper transitively depends on YogaKit which is written in Swift. More about this issue can be found [here](https://twitter.com/krzyzanowskim/status/1151549874653081601?s=21) and [here](https://github.com/Carthage/Carthage/issues/2825).


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

  [client addPlugin:[[FKUserDefaultsPlugin alloc] initWithSuiteName:nil]];
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

## Enabling plugins on Android / iOS

Finally, you need to add plugins to your Flipper client. Above we have only added the Layout Inspector plugin to get you started. See [Network Plugin](setup/network-plugin.md) and [Layout Inspector Plugin](setup/layout-plugin.md) for information on how to add them, and also enable Litho or ComponentKit support. You can check the sample apps in the [GitHub repo](https://github.com/facebook/flipper) for examples of integrating other plugins.

## Setup your React Native app

<div class="warning">

This version of the tutorial is written against **React Native 0.62.0**.

* [Flipper on RN < 0.61.5 tutorial](https://github.com/facebook/flipper/blob/da25241f7fbb06dffd913958559044d758c54fb8/docs/getting-started.md#setup-your-react-native-app)
* [Flipper on RN 0.61.5 - 0.62 tutorial](https://github.com/facebook/flipper/blob/4297b3061f14ceca4d184aa3eebd0731b5bf20f5/docs/getting-started.md#setup-your-react-native-app)

</div>


After generating your project with `npx react-native init`, the Flipper integration is setup out-of-the-box for debug builds:

* For Android, start the Flipper Desktop application, and start your project using `yarn android`. Your application should appear in Flipper.
* For iOS, run `pod install` once in the `ios` directory of your project. After that, run `yarn ios` and start Flipper. Your application should show up in Flipper.

By default, the following plugins will be available:

* Layout Inspector
* Network
* Databases
* Images
* Shared Preferences
* Crash Reporter
* React DevTools
* Metro Logs

Additional plugins might be installed through NPM, please follow the instructions as provided by the plugin authors.

To create your own plugins and integrate with Flipper using JavaScript, check out our [writing plugins for React Native](tutorial/react-native) tutorial!

If you ever need to update the Flipper SDKs used in your project, the versions can be bumped in the `ios/Podfile` and `android/gradle.properties` files of your project. 

<div class="warning">

For Android, Flipper works with both emulators and physical devices connected through USB. However on iOS, we don't support physical devices yet.

</div>

## Having trouble?


See the [troubleshooting page](troubleshooting.html) for help with known problems.
