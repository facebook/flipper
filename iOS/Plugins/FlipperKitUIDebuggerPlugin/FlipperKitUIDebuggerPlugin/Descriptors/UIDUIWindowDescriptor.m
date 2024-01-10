/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "UIDUIWindowDescriptor.h"
#import "UIView+UIDDescriptor.h"

@implementation UIDUIWindowDescriptor

- (id<NSObject>)activeChildForNode:(UIWindow*)node {
  return [node UID_activeChild];
}

- (UIDBounds*)boundsForNode:(UIWindow*)node {
  return [UIDBounds fromRect:node.bounds];
}

@end

#endif
