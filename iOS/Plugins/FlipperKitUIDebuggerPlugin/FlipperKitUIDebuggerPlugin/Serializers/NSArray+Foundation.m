/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "NSArray+Foundation.h"

FB_LINKABLE(NSArray_Foundation)
@implementation NSArray (Foundation)

- (id)toFoundation {
  NSMutableArray* copy = [NSMutableArray arrayWithCapacity:self.count];
  for (id<UIDFoundation> object in self) {
    [copy addObject:[object toFoundation]];
  }
  return copy;
}

@end

#endif
