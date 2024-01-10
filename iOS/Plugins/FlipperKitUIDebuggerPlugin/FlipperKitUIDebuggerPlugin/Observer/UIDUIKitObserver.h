/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

typedef NS_ENUM(NSUInteger, UIDViewHierarchyUpdate) {
  UIDViewHierarchyUpdateAddChild,
  UIDViewHierarchyUpdateRemoveChild,
};

@protocol UIDUIKitObserverDelegate<NSObject>

- (void)onDisplayLayer:(UIView*)view;
- (void)onDrawLayer:(UIView*)view;
- (void)onNeedsDisplay:(UIView*)view;
- (void)onHidden:(UIView*)view;
- (void)onView:(UIView*)view didUpdateHierarchy:(UIDViewHierarchyUpdate)update;

@end

@interface UIDUIKitObserver : NSObject

+ (instancetype)sharedInstance;
+ (void)enable;

- (void)setDrawObservationEnabled:(BOOL)enabled;

@property(nonatomic, weak) id<UIDUIKitObserverDelegate> delegate;

@end

NS_ASSUME_NONNULL_END

#endif
