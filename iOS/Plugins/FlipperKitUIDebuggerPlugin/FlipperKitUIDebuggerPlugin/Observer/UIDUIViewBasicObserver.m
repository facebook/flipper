/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "UIDUIViewBasicObserver.h"
#import "UIDContext.h"
#import "UIDUIKitObserver.h"

@interface UIDUIViewBasicObserver ()<UIDUIKitObserverDelegate> {
  UIDContext* _context;
}

@property(nonatomic, weak) id<UIDUIViewObserverDelegate> delegate;

@end

@implementation UIDUIViewBasicObserver

- (instancetype)initWithContext:(UIDContext*)context
                       delegate:(id<UIDUIViewObserverDelegate>)delegate {
  self = [super init];
  if (self) {
    _context = context;
    _delegate = delegate;

    [UIDUIKitObserver sharedInstance].delegate = self;
    [UIDUIKitObserver enable];
  }
  return self;
}

- (void)dealloc {
  [UIDUIKitObserver sharedInstance].delegate = nil;
}

- (void)onDisplayLayer:(nonnull UIView*)view {
  [self.delegate viewUpdateWith:view];
}

- (void)onDrawLayer:(nonnull UIView*)view {
  [self.delegate viewUpdateWith:view];
}

- (void)onNeedsDisplay:(nonnull UIView*)view {
  [self.delegate viewUpdateWith:view];
}

- (void)onHidden:(nonnull UIView*)view {
  [self.delegate viewUpdateWith:view];
}

- (void)onView:(UIView*)view didUpdateHierarchy:(UIDViewHierarchyUpdate)update {
  [self.delegate viewUpdateWith:view];
}

@end

#endif
