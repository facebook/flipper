/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if DEBUG

#import "FlipperReactNativeJavaScriptPlugin.h"

#import <FlipperKit/FlipperClient.h>
#import <FlipperKit/FlipperResponder.h>

#import "FlipperModule.h"

@implementation FlipperReactNativeJavaScriptPlugin {
  NSString* _pluginId;
  BOOL _inBackground;
}

- (instancetype)initWithFlipperModule:(FlipperModule*)module
                             pluginId:(NSString*)pluginId
                         inBackground:(BOOL)inBackground {
  if (self = [super init]) {
    _module = module;
    _pluginId = pluginId;
    _inBackground = inBackground;
  }
  return self;
}

- (NSString*)identifier {
  return _pluginId;
}

- (BOOL)runInBackground {
  return _inBackground;
}

- (void)didConnect:(id<FlipperConnection>)connection {
  _connection = connection;
  [self fireOnConnect];
}

- (void)didDisconnect {
  _connection = nil;
  [_module sendEventWithName:@"react-native-flipper-plugin-disconnect"
                        body:[self pluginParams]];
}

- (BOOL)isConnected {
  return _connection != nil;
}

- (void)fireOnConnect {
  [_module sendEventWithName:@"react-native-flipper-plugin-connect"
                        body:[self pluginParams]];
}

- (id)pluginParams {
  return @{@"plugin" : _pluginId};
}

@end

#endif
