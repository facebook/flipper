/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "NSDictionary+Foundation.h"

FB_LINKABLE(NSDictionary_Foundation)
@implementation NSDictionary (Foundation)

- (id)toFoundation {
  NSMutableDictionary* copy =
      [NSMutableDictionary dictionaryWithCapacity:self.count];

  for (id key in self) {
    [copy setObject:[self[key] toFoundation] forKey:[key description]];
  }

  return copy;
}

@end

#endif
