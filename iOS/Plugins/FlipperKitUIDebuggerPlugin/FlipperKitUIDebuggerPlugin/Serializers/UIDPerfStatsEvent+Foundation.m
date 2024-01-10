/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "UIDPerfStatsEvent+Foundation.h"

FB_LINKABLE(UIDPerfStatsEvent_Foundation)
@implementation UIDPerfStatsEvent (Foundation)

- (id)toFoundation {
  NSMutableDictionary* data = [NSMutableDictionary dictionaryWithDictionary:@{
    @"txId" : [NSNumber numberWithDouble:self.txId],
    @"observerType" : self.observerType,
    @"nodesCount" : [NSNumber numberWithUnsignedInt:self.nodesCount],
    @"eventsCount" : [NSNumber numberWithUnsignedInt:self.eventsCount],
    @"start" : [NSNumber numberWithLong:self.start],
    @"traversalMS" : [NSNumber numberWithLong:self.traversalMS],
    @"snapshotMS" : [NSNumber numberWithLong:self.snapshotMS],
    @"queuingMS" : [NSNumber numberWithLong:self.queuingMS],
    @"deferredComputationMS" :
        [NSNumber numberWithLong:self.deferredComputationMS],
    @"serializationMS" : [NSNumber numberWithLong:self.serializationMS],
    @"socketMS" : [NSNumber numberWithLong:self.socketMS],
    @"payloadSize" : [NSNumber numberWithLong:self.payloadSize],
    @"frameworkEventsMS" : [NSNumber numberWithLong:self.frameworkEventsMS],
  }];

  if (self.dynamicMeasures) {
    for (id key in self.dynamicMeasures) {
      [data setObject:self.dynamicMeasures[key] forKey:key];
    }
  }
  return data;
}

@end

#endif
