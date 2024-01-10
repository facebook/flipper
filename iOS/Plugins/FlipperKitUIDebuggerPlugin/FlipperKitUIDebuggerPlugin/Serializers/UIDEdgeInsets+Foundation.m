/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "UIDEdgeInsets+Foundation.h"

FB_LINKABLE(UIDEdgeInsets_Foundation)
@implementation UIDEdgeInsets (Foundation)

- (id)toFoundation {
  return @{
    @"top" : [NSNumber numberWithFloat:self.top],
    @"right" : [NSNumber numberWithFloat:self.right],
    @"bottom" : [NSNumber numberWithFloat:self.bottom],
    @"left" : [NSNumber numberWithFloat:self.left],
  };
}

@end

#endif
