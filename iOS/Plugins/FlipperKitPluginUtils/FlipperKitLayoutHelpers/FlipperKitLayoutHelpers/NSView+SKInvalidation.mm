/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if TARGET_OS_OSX
#if FB_SONARKIT_ENABLED

#import <AppKit/AppKit.h>
#import <objc/runtime.h>
#import "NSView+SKInvalidation.h"
#import "SKInvalidation.h"
#import "SKSwizzle.h"

FB_LINKABLE(NSView_SKInvalidation)
@implementation NSView (SKInvalidation)

+ (void)enableInvalidation {
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    swizzleMethods(
        [self class], @selector(setHidden:), @selector(swizzle_setHidden:));
    swizzleMethods(
        [self class], @selector(addSubview:), @selector(swizzle_addSubview:));
    swizzleMethods(
        [self class],
        @selector(removeFromSuperview),
        @selector(swizzle_removeFromSuperview));
  });
}

- (void)swizzle_setHidden:(BOOL)hidden {
  [self swizzle_setHidden:hidden];

  id<SKInvalidationDelegate> delegate =
      [SKInvalidation sharedInstance].delegate;
  if (delegate != nil) {
    [delegate invalidateNode:self.superview];
  }
}

- (void)swizzle_addSubview:(NSView*)view {
  [self swizzle_addSubview:view];
  [[SKInvalidation sharedInstance].delegate invalidateNode:self];
}

- (void)swizzle_removeFromSuperview {
  NSView* oldSuperview = self.superview;
  // Be careful that we always call the swizzled implementation
  // before any early returns or mischief below!
  [self swizzle_removeFromSuperview];

  if (oldSuperview) {
    [[SKInvalidation sharedInstance].delegate invalidateNode:oldSuperview];
  }
}

@end

#endif // FB_SONARKIT_ENABLED
#endif
