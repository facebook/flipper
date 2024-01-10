/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "NSArray+Foundation.h"
#import "UIDSubtreeUpdateEvent+Foundation.h"
#import "UIImage+Foundation.h"

FB_LINKABLE(UIDSubtreeUpdateEvent_Foundation)
@implementation UIDSubtreeUpdateEvent (Foundation)

- (id)toFoundation {
  return @{
    @"txId" : [NSNumber numberWithDouble:self.txId],
    @"observerType" : self.observerType,
    @"rootId" : [NSNumber numberWithUnsignedInt:self.rootId],
    @"nodes" : [self.nodes toFoundation],
    @"snapshot" : self.snapshot ? [self.snapshot toFoundation] : @"",
    @"frameworkEvents" : self.frameworkEvents
        ? [self.frameworkEvents toFoundation]
        : @[],
  };
}

@end

#endif
