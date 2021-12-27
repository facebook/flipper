/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <FlipperKit/FlipperPlugin.h>
#import <Foundation/Foundation.h>

@protocol FlipperKitExampleCommunicationResponderDelegate
- (void)messageReceived:(NSString*)msg;
@end

@interface FlipperKitExamplePlugin : NSObject<FlipperPlugin>
@property(weak, nonatomic) id<FlipperKitExampleCommunicationResponderDelegate>
    delegate;

- (instancetype)init NS_UNAVAILABLE;
- (void)sendMessage:(NSString*)msg;
- (void)triggerNotification;
+ (instancetype)sharedInstance;

@end
