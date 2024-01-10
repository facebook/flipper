/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "UIDUIKitObserver.h"
#import "UIView+Observer.h"

@implementation UIDUIKitObserver

+ (instancetype)sharedInstance {
  static UIDUIKitObserver* instance = nil;

  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    instance = [UIDUIKitObserver new];
  });

  return instance;
}

+ (void)enable {
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    [UIView UID_observe];
  });
}

- (void)setDrawObservationEnabled:(BOOL)enabled {
  [UIView UID_setDrawObservationEnabled:enabled];
}

@end

#endif
