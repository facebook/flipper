/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <React/RCTBridgeModule.h>

#import <FlipperKit/FlipperClient.h>

NS_ASSUME_NONNULL_BEGIN

@class FlipperModule;

@interface FlipperReactNativeJavaScriptPluginManager : NSObject

+ (instancetype)sharedInstance;

- (void)registerPluginWithModule:(FlipperModule*)module
                        pluginId:(NSString*)pluginId
                    inBackground:(BOOL)inBackground
                  statusCallback:(RCTResponseSenderBlock)statusCallback;

- (void)sendWithPluginId:(NSString*)pluginId
                  method:(NSString*)method
                    data:(NSString*)data;

- (void)reportErrorWithMetadata:(NSString*)reason
                     stackTrace:(NSString*)stackTrace
                       pluginId:(NSString*)pluginId;

- (void)reportError:(NSString*)error pluginId:(NSString*)pluginId;

- (void)subscribeWithModule:(FlipperModule*)module
                   pluginId:(NSString*)pluginId
                     method:(NSString*)method;

- (void)respondSuccessWithResponderId:(NSString*)responderId
                                 data:(NSString*)data;

- (void)respondErrorWithResponderId:(NSString*)responderId data:(NSString*)data;

@end

NS_ASSUME_NONNULL_END
