---
id: ios-native
title: Set up your iOS app
sidebar_label: iOS
---

We support both Swift and Objective-C for Flipper with CocoaPods as build and distribution mechanism. 

## CocoaPods

The following configuration assumed CocoaPods 1.9+.

<!--DOCUSAURUS_CODE_TABS-->
<!--Objective-C-->

```ruby
project 'MyApp.xcodeproj'
flipperkit_version = '0.37.0'

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
flipperkit_version = '0.37.0'

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

## For pure Objective-C projects

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

## Enabling plugins

Finally, you need to add plugins to your Flipper client. Above, we have only added the Layout Inspector plugin to get you started. See [Network Plugin](setup/network-plugin.md) and [Layout Inspector Plugin](setup/layout-plugin.md) for information on how to add them, and also enable Litho or ComponentKit support. You can check the sample apps in the [GitHub repo](https://github.com/facebook/flipper) for examples of integrating other plugins.

## Having trouble?

See the [troubleshooting page](../troubleshooting) for help with known problems.

<div class="warning">

On iOS, we currently do not support connecting to physical devices.

</div>
