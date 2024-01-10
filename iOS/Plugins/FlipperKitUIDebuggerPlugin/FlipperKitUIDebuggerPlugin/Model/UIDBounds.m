/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "UIDBounds.h"

@implementation UIDBounds

- (instancetype)initWithX:(NSInteger)x
                        y:(NSInteger)y
                    width:(NSInteger)width
                   height:(NSInteger)height {
  self = [super init];
  if (self) {
    self.x = x;
    self.y = y;
    self.width = width;
    self.height = height;
  }
  return self;
}

+ (instancetype)fromRect:(CGRect)rect {
  return [[UIDBounds alloc] initWithX:rect.origin.x
                                    y:rect.origin.y
                                width:rect.size.width
                               height:rect.size.height];
}

@end

#endif
