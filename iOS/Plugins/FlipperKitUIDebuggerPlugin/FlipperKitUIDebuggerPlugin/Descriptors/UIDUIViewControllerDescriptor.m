/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "UIDUIViewControllerDescriptor.h"

@implementation UIDUIViewControllerDescriptor

- (NSArray<id<NSObject>>*)childrenOfNode:(UIViewController*)node {
  if (node.view != nil) {
    return [NSArray arrayWithObject:node.view];
  }

  return [NSArray array];
}

- (UIDBounds*)boundsForNode:(UIViewController*)node {
  CGRect bounds = CGRectMake(
      0, 0, node.view.bounds.size.width, node.view.bounds.size.height);
  return [UIDBounds fromRect:bounds];
}

@end

#endif
