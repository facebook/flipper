/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "SKTapListenerMock.h"

@implementation SKTapListenerMock {
  NSMutableArray<SKTapReceiver>* _tapReceivers;
}

@synthesize isMounted;

- (instancetype)init {
  if (self = [super init]) {
    _tapReceivers = [NSMutableArray new];
  }

  return self;
}

- (void)listenForTapWithBlock:(SKTapReceiver)receiver {
  [_tapReceivers addObject:receiver];
}

- (void)tapAt:(CGPoint)point {
  for (SKTapReceiver recv in _tapReceivers) {
    recv(point);
  }

  [_tapReceivers removeAllObjects];
}

- (void)mountWithFrame:(CGRect)frame {
  isMounted = YES;
}

- (void)unmount {
  isMounted = NO;
}

@end
