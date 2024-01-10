/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "UIDFrameworkEvent+Foundation.h"

FB_LINKABLE(UIDFrameworkEvent_Foundation)
@implementation UIDFrameworkEvent (Foundation)

- (id)toFoundation {
  NSMutableDictionary* data = [NSMutableDictionary dictionaryWithDictionary:@{
    @"nodeId" : [NSNumber numberWithUnsignedInt:self.nodeIdentifier],
    @"type" : self.type,
    @"timestamp" :
        [NSNumber numberWithDouble:self.timestamp.timeIntervalSince1970],
    @"payload" : self.payload ?: @{},
  }];

  if (self.stacktrace) {
    [data setObject:@{@"stacktrace" : self.stacktrace, @"type" : @"stacktrace"}
             forKey:@"attribution"];
  }

  return data;
}

@end

#endif
