/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "NSArray+Foundation.h"
#import "UIDFrameScanEvent+Foundation.h"
#import "UIImage+Foundation.h"

FB_LINKABLE(UIDSnapshotInfo_Foundation)
@implementation UIDSnapshotInfo (Foundation)

- (id)toFoundation {
  return @{
    @"nodeId" : self.nodeId,
    @"data" : self.image ? [self.image toFoundation] : @"",
  };
}

@end

FB_LINKABLE(UIDFrameScanEvent_Foundation)
@implementation UIDFrameScanEvent (Foundation)

- (id)toFoundation {
  return @{
    @"frameTime" : [NSNumber numberWithDouble:self.timestamp],
    @"nodes" : [self.nodes toFoundation],
    @"snapshot" : [self.snapshot toFoundation],
    @"frameworkEvents" : self.frameworkEvents
        ? [self.frameworkEvents toFoundation]
        : @[],
  };
}

@end

#endif
