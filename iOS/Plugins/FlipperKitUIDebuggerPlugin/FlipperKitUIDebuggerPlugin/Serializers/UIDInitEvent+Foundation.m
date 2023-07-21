/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED

#import "NSArray+Foundation.h"
#import "UIDInitEvent+Foundation.h"

FB_LINKABLE(UIDInitEvent_Foundation)
@implementation UIDInitEvent (Foundation)

- (id)toFoundation {
  return @{
    @"rootId" : [NSNumber numberWithUnsignedInt:self.rootId],
    @"frameworkEventMetadata" : self.frameworkEventMetadata
        ? [self.frameworkEventMetadata toFoundation]
        : @[],
  };
}

@end

#endif
