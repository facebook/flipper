/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED

#import "SKInvalidation.h"

#if TARGET_OS_IPHONE

#import <UIKit/UIKit.h>
#import "UICollectionView+SKInvalidation.h"
#import "UIView+SKInvalidation.h"

#elif TARGET_OS_OSX

#import <AppKit/AppKit.h>
#import "NSCollectionView+SKInvalidation.h"
#import "NSView+SKInvalidation.h"

#endif

@implementation SKInvalidation

+ (instancetype)sharedInstance {
  static SKInvalidation* sInstance = nil;

  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    sInstance = [SKInvalidation new];
  });

  return sInstance;
}

+ (void)enableInvalidations {
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
#if TARGET_OS_IPHONE
    [UIView enableInvalidation];
    [UICollectionView enableInvalidations];

    [[NSNotificationCenter defaultCenter]
        addObserver:self
           selector:@selector(windowDidBecomeVisible:)
               name:UIWindowDidBecomeVisibleNotification
             object:nil];

    [[NSNotificationCenter defaultCenter]
        addObserver:self
           selector:@selector(windowDidBecomeHidden:)
               name:UIWindowDidBecomeHiddenNotification
             object:nil];

#elif TARGET_OS_OSX

    [NSView enableInvalidation];
    [NSCollectionView enableInvalidations];

#endif
  });
}

+ (void)windowDidBecomeVisible:(NSNotification*)notification {
  [[SKInvalidation sharedInstance].delegate
      invalidateNode:[notification.object nextResponder]];
}

+ (void)windowDidBecomeHidden:(NSNotification*)notification {
  [[SKInvalidation sharedInstance].delegate
      invalidateNode:[notification.object nextResponder]];
}

@end

#endif
