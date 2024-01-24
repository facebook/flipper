/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "UIDUINavigationControllerDescriptor.h"

@implementation UIDUINavigationControllerDescriptor

- (NSArray<id<NSObject>>*)childrenOfNode:(UINavigationController*)node {
  return node.viewControllers;
}

- (id<NSObject>)activeChildForNode:(UINavigationController*)node {
/* @cwt-override FIXME[T168581563]: -Wnullable-to-nonnull-conversion */
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wnullable-to-nonnull-conversion"
  return node.visibleViewController;
#pragma clang diagnostic pop
}

- (UIDBounds*)boundsForNode:(UINavigationController*)node {
  return [UIDBounds fromRect:node.view.bounds];
}

@end

#endif
