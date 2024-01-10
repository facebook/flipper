/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "UIDBounds+Foundation.h"

FB_LINKABLE(UIDBounds_Foundation)
@implementation UIDBounds (Foundation)

- (id)toFoundation {
  return @{
    @"x" : [NSNumber numberWithInt:self.x],
    @"y" : [NSNumber numberWithInt:self.y],
    @"width" : [NSNumber numberWithInt:self.width],
    @"height" : [NSNumber numberWithInt:self.height],
  };
}

@end

#endif
