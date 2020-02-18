/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "FlipperReactNativeJavaScriptPluginManager.h"
#import <FlipperKit/FlipperClient.h>
#import <FlipperKit/FlipperPlugin.h>
#import <React/RCTUtils.h>
#import "FlipperModule.h"
#import "FlipperReactNativeJavaScriptPlugin.h"

static uint32_t FlipperResponderKeyGenerator = 0;

@implementation FlipperReactNativeJavaScriptPluginManager {
  __weak FlipperClient* _flipperClient;
  NSMutableDictionary<NSString*, id<FlipperResponder>>* _responders;
}

+ (instancetype)sharedInstance {
  static FlipperReactNativeJavaScriptPluginManager* sharedInstance = nil;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    sharedInstance = [self new];
  });
  return sharedInstance;
}

- (instancetype)init {
  if (self = [super init]) {
    _flipperClient = [FlipperClient sharedClient];
    _responders = [NSMutableDictionary new];
  }
  return self;
}

- (void)registerPluginWithModule:(FlipperModule*)module
                        pluginId:(NSString*)pluginId
                    inBackground:(BOOL)inBackground
                  statusCallback:(RCTResponseSenderBlock)statusCallback {
  if (_flipperClient == nil) {
    // Flipper is not available in this build
    statusCallback(@[ @"noflipper" ]);
    return;
  }

  FlipperReactNativeJavaScriptPlugin* existingPlugin =
      [self jsPluginWithIdentifier:pluginId];
  if (existingPlugin != nil) {
    existingPlugin.module = module;

    if (existingPlugin.isConnected) {
      [existingPlugin fireOnConnect];
    }

    statusCallback(@[ @"ok" ]);
    return;
  }

  FlipperReactNativeJavaScriptPlugin* newPlugin =
      [[FlipperReactNativeJavaScriptPlugin alloc]
          initWithFlipperModule:module
                       pluginId:pluginId
                   inBackground:inBackground];
  [_flipperClient addPlugin:newPlugin];
  statusCallback(@[ @"ok" ]);
}

- (void)sendWithPluginId:(NSString*)pluginId
                  method:(NSString*)method
                    data:(NSString*)data {
  [[self jsPluginWithIdentifier:pluginId].connection
            send:method
      withParams:RCTJSONParse(data, NULL)];
}

- (void)reportErrorWithMetadata:(NSString*)reason
                     stackTrace:(NSString*)stackTrace
                       pluginId:(NSString*)pluginId {
  [[self jsPluginWithIdentifier:pluginId].connection
      errorWithMessage:reason
            stackTrace:stackTrace];
}

- (void)reportError:(NSString*)error pluginId:(NSString*)pluginId {
  // Stacktrace
  NSMutableArray<NSString*>* callstack = NSThread.callStackSymbols.mutableCopy;
  NSMutableString* callstackString = callstack.firstObject.mutableCopy;
  [callstack removeObject:callstack.firstObject];
  for (NSString* stack in callstack) {
    [callstackString appendFormat:@"\n %@", stack];
  }

  [[self jsPluginWithIdentifier:pluginId].connection
      errorWithMessage:error
            stackTrace:callstackString];
}

- (void)subscribeWithModule:(FlipperModule*)module
                   pluginId:(NSString*)pluginId
                     method:(NSString*)method {
  __weak __typeof(self) weakSelf = self;
  [[self jsPluginWithIdentifier:pluginId].connection
        receive:method
      withBlock:^(NSDictionary* params, id<FlipperResponder> responder) {
        __typeof(self) strongSelf = weakSelf;

        NSMutableDictionary* body =
            [NSMutableDictionary dictionaryWithDictionary:@{
              @"plugin" : pluginId,
              @"method" : method,
              @"params" : RCTJSONStringify(params, NULL),
            }];

        if (responder != nil) {
          NSString* responderId =
              [NSString stringWithFormat:@"%d", FlipperResponderKeyGenerator++];
          strongSelf->_responders[responderId] = responder;
          body[@"responderId"] = responderId;
        }

        [module sendEventWithName:@"react-native-flipper-receive-event"
                             body:body];
      }];
}

- (void)respondSuccessWithResponderId:(NSString*)responderId
                                 data:(NSString*)data {
  id<FlipperResponder> responder = _responders[responderId];
  [responder success:RCTJSONParse(data, NULL)];
  [_responders removeObjectForKey:responderId];
}

- (void)respondErrorWithResponderId:(NSString*)responderId
                               data:(NSString*)data {
  id<FlipperResponder> responder = _responders[responderId];
  [responder error:RCTJSONParse(data, NULL)];
  [_responders removeObjectForKey:responderId];
}

- (FlipperReactNativeJavaScriptPlugin*)jsPluginWithIdentifier:
    (NSString*)pluginId {
  return (FlipperReactNativeJavaScriptPlugin*)[_flipperClient
      pluginWithIdentifier:pluginId];
}

@end
