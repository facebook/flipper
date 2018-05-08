/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
#import "AppDelegate.h"

#import <SKIOSNetworkPlugin/SKIOSNetworkAdapter.h>
#import <SonarKit/SonarClient.h>
#import <SonarKitLayoutComponentKitSupport/SonarKitLayoutComponentKitSupport.h>
#import <SonarKitLayoutPlugin/SonarKitLayoutPlugin.h>
#import <SonarKitNetworkPlugin/SonarKitNetworkPlugin.h>

#import "RootViewController.h"

#if !FB_SONARKIT_ENABLED
#error "Sample need to be run with SonarKit enabled in order to properly interact with Sonar. SonarKit is enabled by default if its a debug build."
#endif

@implementation AppDelegate {
  UIWindow *_window;
}

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  _window = [[UIWindow alloc] initWithFrame:[[UIScreen mainScreen] bounds]];

  SonarClient *client = [SonarClient sharedClient];

  SKDescriptorMapper *layoutDescriptorMapper = [[SKDescriptorMapper alloc] initWithDefaults];
  [SonarKitLayoutComponentKitSupport setUpWithDescriptorMapper: layoutDescriptorMapper];
  [client addPlugin: [[SonarKitLayoutPlugin alloc] initWithRootNode: application
                                               withDescriptorMapper: layoutDescriptorMapper]];

  [[SonarClient sharedClient] addPlugin: [[SonarKitNetworkPlugin alloc] initWithNetworkAdapter:[SKIOSNetworkAdapter new]]];
  [[SonarClient sharedClient] start];

  RootViewController *rootViewController = [RootViewController new];

  [_window setRootViewController: [[UINavigationController alloc] initWithRootViewController: rootViewController]];
  [_window makeKeyAndVisible];
  return YES;
}

@end
