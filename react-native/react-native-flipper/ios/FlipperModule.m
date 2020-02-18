/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "FlipperModule.h"

#import "FlipperReactNativeJavaScriptPluginManager.h"

@implementation FlipperModule {
  __weak FlipperReactNativeJavaScriptPluginManager* _manager;
}

- (instancetype)init {
  return [self initWithManager:[FlipperReactNativeJavaScriptPluginManager
                                   sharedInstance]];
}

- (instancetype)initWithManager:
    (FlipperReactNativeJavaScriptPluginManager*)manager {
  if (self = [super init]) {
    _manager = manager;
  }
  return self;
}

RCT_EXPORT_MODULE(Flipper)

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

- (NSArray<NSString*>*)supportedEvents {
  return @[
    @"react-native-flipper-plugin-connect",
    @"react-native-flipper-plugin-disconnect",
    @"react-native-flipper-receive-event",
  ];
}

- (void)startObserving {
}

- (void)stopObserving {
}

RCT_EXPORT_METHOD(registerPlugin
                  : (NSString*)pluginId inBackground
                  : (BOOL)inBackground statusCallback
                  : (RCTResponseSenderBlock)statusCallback) {
  [_manager registerPluginWithModule:self
                            pluginId:pluginId
                        inBackground:inBackground
                      statusCallback:statusCallback];
}

RCT_EXPORT_METHOD(send
                  : (NSString*)pluginId method
                  : (NSString*)method data
                  : (NSString*)data) {
  [_manager sendWithPluginId:pluginId method:method data:data];
}

RCT_EXPORT_METHOD(reportErrorWithMetadata
                  : (NSString*)pluginId reason
                  : (NSString*)reason stackTrace
                  : (NSString*)stackTrace) {
  [_manager reportErrorWithMetadata:reason
                         stackTrace:stackTrace
                           pluginId:pluginId];
}

RCT_EXPORT_METHOD(reportError : (NSString*)pluginId error : (NSString*)error) {
  [_manager reportError:error pluginId:pluginId];
}

RCT_EXPORT_METHOD(subscribe : (NSString*)pluginId method : (NSString*)method) {
  [_manager subscribeWithModule:self pluginId:pluginId method:method];
}

RCT_EXPORT_METHOD(respondSuccess
                  : (NSString*)responderId data
                  : (NSString*)data) {
  [_manager respondSuccessWithResponderId:responderId data:data];
}

RCT_EXPORT_METHOD(respondError
                  : (NSString*)responderId data
                  : (NSString*)data) {
  [_manager respondErrorWithResponderId:responderId data:data];
}

@end
