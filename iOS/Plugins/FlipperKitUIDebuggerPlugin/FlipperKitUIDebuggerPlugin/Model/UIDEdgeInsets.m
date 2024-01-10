/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "UIDEdgeInsets.h"

@implementation UIDEdgeInsets

- (instancetype)initWithTop:(CGFloat)top
                      right:(CGFloat)right
                     bottom:(CGFloat)bottom
                       left:(CGFloat)left {
  self = [super init];
  if (self) {
    _top = top;
    _right = right;
    _bottom = bottom;
    _left = left;
  }
  return self;
}

+ (instancetype)fromUIEdgeInsets:(UIEdgeInsets)edgeInsets {
  return [[UIDEdgeInsets alloc] initWithTop:edgeInsets.top
                                      right:edgeInsets.right
                                     bottom:edgeInsets.bottom
                                       left:edgeInsets.left];
}

@end

#endif
