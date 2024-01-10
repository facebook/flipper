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
  return node.viewControllers;
}

- (id<NSObject>)activeChildForNode:(UITabBarController*)node {
  return node.selectedViewController;
}

- (UIDBounds*)boundsForNode:(UITabBarController*)node {
  return [UIDBounds fromRect:node.view.bounds];
}

@end

#endif
