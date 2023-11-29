/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED

#import "UIDUINavigationControllerDescriptor.h"

@implementation UIDUINavigationControllerDescriptor

- (NSArray<id<NSObject>>*)childrenOfNode:(UINavigationController*)node {
  return node.viewControllers;
}

- (id<NSObject>)activeChildForNode:(UINavigationController*)node {
  return node.visibleViewController;
}

- (UIDBounds*)boundsForNode:(UINavigationController*)node {
  return [UIDBounds fromRect:node.view.bounds];
}

@end

#endif
