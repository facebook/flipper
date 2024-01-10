/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "UIDSwizzle.h"
#import "UIDUIKitObserver.h"
#import "UIView+Observer.h"

static BOOL UID_DrawObserverEnabled = true;

FB_LINKABLE(UIView_Observer)
@implementation UIView (Observer)

+ (void)UID_setDrawObservationEnabled:(BOOL)enabled {
  UID_DrawObserverEnabled = enabled;
}

+ (void)UID_observe {
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    UIDSwizzleMethod(
        [self class],
        @selector(drawLayer:inContext:),
        @selector(UID_drawLayer:inContext:),
        false);
    UIDSwizzleMethod(
        [self class],
        @selector(displayLayer:),
        @selector(UID_displayLayer:),
        false);
    UIDSwizzleMethod(
        [self class],
        @selector(setNeedsDisplay),
        @selector(UID_setNeedsDisplay),
        false);
    UIDSwizzleMethod(
        [self class],
        @selector(addSubview:),
        @selector(UID_addSubview:),
        false);
    UIDSwizzleMethod(
        [self class],
        @selector(insertSubview:atIndex:),
        @selector(UID_insertSubview:atIndex:),
        false);
    UIDSwizzleMethod(
        [self class],
        @selector(insertSubview:aboveSubview:),
        @selector(UID_insertSubview:aboveSubview:),
        false);
    UIDSwizzleMethod(
        [self class],
        @selector(insertSubview:belowSubview:),
        @selector(UID_insertSubview:belowSubview:),
        false);
    UIDSwizzleMethod(
        [self class],
        @selector(removeFromSuperview),
        @selector(UID_removeFromSuperview),
        false);
    UIDSwizzleMethod(
        [self class], @selector(setHidden:), @selector(UID_setHidden:), true);
  });
}

- (void)UID_displayLayer:(CALayer*)layer {
  [self UID_displayLayer:layer];
  if (UID_DrawObserverEnabled) {
    [[UIDUIKitObserver sharedInstance].delegate onDisplayLayer:self];
  }
}

- (void)UID_drawLayer:(CALayer*)layer inContext:(CGContextRef)ctx {
  [self UID_drawLayer:layer inContext:ctx];
  if (UID_DrawObserverEnabled) {
    [[UIDUIKitObserver sharedInstance].delegate onDrawLayer:self];
  }
}

- (void)UID_setNeedsDisplay {
  [self UID_setNeedsDisplay];
  if (UID_DrawObserverEnabled) {
    [[UIDUIKitObserver sharedInstance].delegate onNeedsDisplay:self];
  }
}

- (void)UID_setHidden:(BOOL)isHidden {
  [self UID_setHidden:isHidden];
  if (UID_DrawObserverEnabled) {
    [[UIDUIKitObserver sharedInstance].delegate onHidden:self];
  }
}

- (void)UID_addSubview:(UIView*)view {
  [self UID_addSubview:view];
  if (UID_DrawObserverEnabled) {
    [[UIDUIKitObserver sharedInstance].delegate
                    onView:self
        didUpdateHierarchy:UIDViewHierarchyUpdateAddChild];
  }
}

- (void)UID_insertSubview:(UIView*)subview atIndex:(NSInteger)index {
  [self UID_insertSubview:subview atIndex:index];
  if (UID_DrawObserverEnabled) {
    [[UIDUIKitObserver sharedInstance].delegate
                    onView:self
        didUpdateHierarchy:UIDViewHierarchyUpdateAddChild];
  }
}

- (void)UID_insertSubview:(UIView*)subview
             aboveSubview:(UIView*)siblingSubview {
  [self UID_insertSubview:subview aboveSubview:siblingSubview];
  if (UID_DrawObserverEnabled) {
    [[UIDUIKitObserver sharedInstance].delegate
                    onView:self
        didUpdateHierarchy:UIDViewHierarchyUpdateAddChild];
  }
}

- (void)UID_insertSubview:(UIView*)subview
             belowSubview:(UIView*)siblingSubview {
  [self UID_insertSubview:subview belowSubview:siblingSubview];
  if (UID_DrawObserverEnabled) {
    [[UIDUIKitObserver sharedInstance].delegate
                    onView:self
        didUpdateHierarchy:UIDViewHierarchyUpdateAddChild];
  }
}

- (void)UID_removeFromSuperview {
  UIView* oldSuperview = self.superview;
  [self UID_removeFromSuperview];
  /**
    Not enough to check if draw observation is enabled (which is disabled
    during snapshots). An extra check is needed in case the old superview is
    _UISnapshotWindow_. The reason is _UIView_removeFromSuperview_ can also be
    called during deallocation after the screenshot is taken and observation is
    re-enabled. Without the extra check, it creates a recursive loop in which
    the view is constantly marked as dirty.
   */
  if (UID_DrawObserverEnabled &&
      ![oldSuperview isKindOfClass:NSClassFromString(@"_UISnapshotWindow")]) {
    [[UIDUIKitObserver sharedInstance].delegate
                    onView:oldSuperview
        didUpdateHierarchy:UIDViewHierarchyUpdateRemoveChild];
  }
}

@end

#endif
