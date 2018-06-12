/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
#if FB_SONARKIT_ENABLED

#import "SonarClient.h"
#import "SonarCppWrapperPlugin.h"
#import <Sonar/SonarClient.h>
#include <folly/io/async/EventBase.h>
#include <folly/io/async/ScopedEventBaseThread.h>
#import <UIKit/UIKit.h>

#if !TARGET_OS_SIMULATOR
//#import "SKPortForwardingServer.h"
#endif

using WrapperPlugin = facebook::sonar::SonarCppWrapperPlugin;

@implementation SonarClient {
  facebook::sonar::SonarClient *_cppClient;
  folly::ScopedEventBaseThread eventBaseThread;
#if !TARGET_OS_SIMULATOR
 // SKPortForwardingServer *_server;
#endif
}

+ (instancetype)sharedClient
{
  static SonarClient *sharedClient = nil;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    sharedClient = [[self alloc] init];
  });
  return sharedClient;
}

- (instancetype)init
{
  if (self = [super init]) {
    UIDevice *device = [UIDevice currentDevice];
    NSString *deviceName = [device name];
    NSString *appName = [[NSBundle mainBundle] objectForInfoDictionaryKey:(NSString *)kCFBundleNameKey];
    NSString *deviceId = [[device identifierForVendor]UUIDString];
    NSString *appId = appName;
    NSString *privateAppDirectory = NSSearchPathForDirectoriesInDomains(NSApplicationSupportDirectory, NSUserDomainMask, YES)[0];

    NSFileManager *manager = [NSFileManager defaultManager];

    if ([manager fileExistsAtPath:privateAppDirectory isDirectory:NULL] == NO) {
      //TODO: Handle errors properly
      [manager createDirectoryAtPath:privateAppDirectory withIntermediateDirectories:YES attributes:nil error:nil];
    }

#if TARGET_OS_SIMULATOR
    deviceName = [NSString stringWithFormat:@"%@ %@", [[UIDevice currentDevice] model], @"Simulator"];
#endif

    facebook::sonar::SonarClient::init({
      {
        "localhost",
        "iOS",
        [deviceName UTF8String],
        [deviceId UTF8String],
        [appName UTF8String],
        [appId UTF8String],
        [privateAppDirectory UTF8String],
      },
      eventBaseThread.getEventBase(),
    });
    _cppClient = facebook::sonar::SonarClient::instance();
  }
  return self;
}

- (void)refreshPlugins
{
  _cppClient->refreshPlugins();
}

- (void)addPlugin:(NSObject<SonarPlugin> *)plugin
{
  _cppClient->addPlugin(std::make_shared<WrapperPlugin>(plugin));
}

- (void)removePlugin:(NSObject<SonarPlugin> *)plugin
{
  _cppClient->removePlugin(std::make_shared<WrapperPlugin>(plugin));
}

- (NSObject<SonarPlugin> *)pluginWithIdentifier:(NSString *)identifier
{
  auto cppPlugin = _cppClient->getPlugin([identifier UTF8String]);
  if (auto wrapper = dynamic_cast<WrapperPlugin *>(cppPlugin.get())) {
    return wrapper->getObjCPlugin();
  }
  return nil;
}

- (void)start;
{
#if !TARGET_OS_SIMULATOR
  // _server = [SKPortForwardingServer new];
  // [_server forwardConnectionsFromPort:8088];
  // [_server listenForMultiplexingChannelOnPort:8078];
#endif
  _cppClient->start();
}

- (void)stop
{
  _cppClient->stop();
#if !TARGET_OS_SIMULATOR
  // [_server close];
  // _server = nil;
#endif
}

@end

#endif
