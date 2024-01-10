/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "NSSet+Foundation.h"

FB_LINKABLE(NSSet_Foundation)
@implementation NSSet (Foundation)

- (id)toFoundation {
  NSMutableArray* copy = [NSMutableArray arrayWithCapacity:self.count];
  for (id<UIDFoundation> object in self) {
    [copy addObject:[object toFoundation]];
  }
  return copy;
}

@end

#endif
