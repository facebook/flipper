/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "FlipperConnectionMock.h"

@implementation FlipperConnectionMock

- (instancetype)init {
  if (self = [super init]) {
    _connected = YES;
    _receivers = @{};
    _sent = @{};
    _sentWithArray = @{};
  }
  return self;
}

- (void)sendInternal:(NSString*)method
          withParams:(id)params
            loggedTo:(NSDictionary* __strong*)sentLog {
  if (_connected) {
    NSMutableDictionary* newSentLog = [NSMutableDictionary new];
    [newSentLog addEntriesFromDictionary:*sentLog];
    if (newSentLog[method]) {
      newSentLog[method] = [(*sentLog)[method] arrayByAddingObject:params];
    } else {
      newSentLog[method] = @[ params ];
    }
    *sentLog = newSentLog;
  }
}

- (void)send:(NSString*)method withParams:(NSDictionary*)params {
  [self sendInternal:method withParams:params loggedTo:&_sent];
}

- (void)send:(NSString*)method withRawParams:(NSString*)params {
  [self sendInternal:method withParams:params loggedTo:&_sent];
}

- (void)send:(NSString*)method withArrayParams:(NSArray*)params {
  [self sendInternal:method withParams:params loggedTo:&_sentWithArray];
}

- (void)receive:(NSString*)method withBlock:(SonarReceiver)receiver {
  if (_connected) {
    NSMutableDictionary* newReceivers = [NSMutableDictionary new];
    [newReceivers addEntriesFromDictionary:_receivers];
    newReceivers[method] = receiver;
    _receivers = newReceivers;
  }
}

- (void)errorWithMessage:(NSString*)message stackTrace:(NSString*)stacktrace {
  // Empty Implementation
  // TODO: Test this method too.
}

@end
