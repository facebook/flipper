/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "UIDUITabBarControllerDescriptor.h"

@implementation UIDUITabBarControllerDescriptor

- (NSArray<id<NSObject>>*)childrenOfNode:(UITabBarController*)node {
/* @cwt-override FIXME[T168581563]: -Wnullable-to-nonnull-conversion */
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wnullable-to-nonnull-conversion"
  return node.viewControllers;
#pragma clang diagnostic pop
}

- (id<NSObject>)activeChildForNode:(UITabBarController*)node {
/* @cwt-override FIXME[T168581563]: -Wnullable-to-nonnull-conversion */
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wnullable-to-nonnull-conversion"
  return node.selectedViewController;
#pragma clang diagnostic pop
}

- (UIDBounds*)boundsForNode:(UITabBarController*)node {
  return [UIDBounds fromRect:node.view.bounds];
}

@end

#endif
