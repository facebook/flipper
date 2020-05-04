/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED

#import <UIKit/UIKit.h>
#import <objc/runtime.h>
#import "SKInvalidation.h"
#import "SKSwizzle.h"
#import "UIView+SKInvalidation.h"

FB_LINKABLE(UIView_SKInvalidation)
@implementation UIView (SKInvalidation)

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

/**
This function takes in a view and returns true if the view is a UIWindow and its
windowLevel is an alert one otherwise it returns false.
*/
static auto shouldInvalidateRootNode(UIView* view) -> bool {
  return [view isKindOfClass:[UIWindow class]];
}

- (void)swizzle_setHidden:(BOOL)hidden {
  [self swizzle_setHidden:hidden];

  id<SKInvalidationDelegate> delegate =
      [SKInvalidation sharedInstance].delegate;
  if (delegate != nil) {
    [delegate invalidateNode:self.superview];
  }
}

- (void)swizzle_addSubview:(UIView*)view {
  [self swizzle_addSubview:view];

  id<SKInvalidationDelegate> delegate =
      [SKInvalidation sharedInstance].delegate;
  if (delegate != nil) {
    if (shouldInvalidateRootNode(view.superview)) {
      [delegate invalidateRootNode];
      return;
    }
    [delegate invalidateNode:view.superview];
  }
}

- (void)swizzle_removeFromSuperview {
  id<SKInvalidationDelegate> delegate =
      [SKInvalidation sharedInstance].delegate;
  if (delegate != nil && self.superview != nil) {
    if (shouldInvalidateRootNode(self.superview)) {
      [delegate invalidateRootNode];
      return;
    }
    [delegate invalidateNode:self.superview];
  }

  [self swizzle_removeFromSuperview];
}

@end

#endif
