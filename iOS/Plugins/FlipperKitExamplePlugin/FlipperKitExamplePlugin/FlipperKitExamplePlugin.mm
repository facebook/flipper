/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED
#import "FlipperKitExamplePlugin.h"
#import <FlipperKit/FlipperClient.h>
#import <FlipperKit/FlipperConnection.h>
#import <FlipperKit/FlipperResponder.h>

@interface FlipperKitExamplePlugin ()
@property(strong, nonatomic) id<FlipperConnection> connection;
@property(nonatomic) NSInteger triggerCount;

@end

@implementation FlipperKitExamplePlugin

- (instancetype)init {
  if (self = [super init]) {
    _triggerCount = 0;
  }
  return self;
}

+ (instancetype)sharedInstance {
  static FlipperKitExamplePlugin* sInstance = nil;

  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    sInstance = [FlipperKitExamplePlugin new];
  });

  return sInstance;
}

- (void)didConnect:(id<FlipperConnection>)connection {
  __weak FlipperKitExamplePlugin* weakSelf = self;
  self.connection = connection;
  [connection receive:@"displayMessage"
            withBlock:^(NSDictionary* params, id<FlipperResponder> responder) {
              [weakSelf.delegate messageReceived:params[@"message"]];
              [responder success:@{@"greeting" : @"Hello"}];
            }];
}

- (void)didDisconnect {
  self.connection = nil;
}

- (NSString*)identifier {
  return @"Example";
}

- (BOOL)runInBackground {
  return YES;
}

- (void)sendMessage:(NSString*)msg {
  [self.connection send:@"displayMessage" withParams:@{@"msg" : msg}];
}

- (void)triggerNotification {
  [self.connection send:@"triggerNotification"
             withParams:@{@"id" : @(self.triggerCount)}];
  self.triggerCount++;
}

@end

#endif
