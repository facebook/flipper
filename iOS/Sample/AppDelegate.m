/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "AppDelegate.h"
#import <FlipperKit/FlipperClient.h>
#import <FlipperKitExamplePlugin/FlipperKitExamplePlugin.h>
#import <FlipperKitLayoutPlugin/FlipperKitLayoutPlugin.h>
#import <FlipperKitNetworkPlugin/FlipperKitNetworkPlugin.h>
#import <FlipperKitReactPlugin/FlipperKitReactPlugin.h>
#import <FlipperKitUserDefaultsPlugin/FKUserDefaultsPlugin.h>
#import <SKIOSNetworkPlugin/SKIOSNetworkAdapter.h>

#import "MainViewController.h"

#if !FB_SONARKIT_ENABLED
#error \
    "Sample need to be run with SonarKit enabled in order to properly interact with Sonar. SonarKit is enabled by default if its a debug build."
#endif

@implementation AppDelegate {
  UIWindow* _window;
}

- (BOOL)application:(UIApplication*)application
    didFinishLaunchingWithOptions:(NSDictionary*)launchOptions {
  _window = [[UIWindow alloc] initWithFrame:[[UIScreen mainScreen] bounds]];
  FlipperClient* client = [FlipperClient sharedClient];

  SKDescriptorMapper* layoutDescriptorMapper =
      [[SKDescriptorMapper alloc] initWithDefaults];

  [client addPlugin:[[FlipperKitLayoutPlugin alloc]
                            initWithRootNode:application
                        withDescriptorMapper:layoutDescriptorMapper]];

  [client addPlugin:[[FKUserDefaultsPlugin alloc] initWithSuiteName:nil]];

  [[FlipperClient sharedClient]
      addPlugin:[[FlipperKitNetworkPlugin alloc]
                    initWithNetworkAdapter:[SKIOSNetworkAdapter new]]];
  [client addPlugin:[FlipperKitExamplePlugin sharedInstance]];
  [client addPlugin:[FlipperKitReactPlugin new]];
  [client start];

  UIStoryboard* storyboard = [UIStoryboard storyboardWithName:@"MainStoryBoard"
                                                       bundle:nil];
  MainViewController* mainViewController = [storyboard
      instantiateViewControllerWithIdentifier:@"MainViewController"];

  UINavigationController* navigationController = [[UINavigationController alloc]
      initWithRootViewController:mainViewController];
  navigationController.navigationBar.topItem.title = @"Sample";
  navigationController.navigationBar.translucent = NO;

  [_window
      setRootViewController:[[UINavigationController alloc]
                                initWithRootViewController:mainViewController]];
  [_window makeKeyAndVisible];

  NSLog(@"Hello from Flipper in an Objc app!");
  return YES;
}

@end
