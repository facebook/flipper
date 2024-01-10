/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "UIDInspectable+Foundation.h"
#import "UIDInspectableArray+Foundation.h"

FB_LINKABLE(UIDInspectableArray_Foundation)
@implementation UIDInspectableArray (Foundation)

- (id)toFoundation {
  NSMutableArray* items = [NSMutableArray arrayWithCapacity:self.items.count];
  for (UIDInspectable* object in self.items) {
    [items addObject:[object toFoundation]];
  }

  return @{@"type" : @"array", @"items" : items};
}

@end

#endif
