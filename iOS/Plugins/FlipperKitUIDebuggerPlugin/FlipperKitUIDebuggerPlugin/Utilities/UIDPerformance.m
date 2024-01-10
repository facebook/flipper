/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#include "UIDPerformance.h"

#ifdef __cplusplus
extern "C" {
#endif

static NSMutableDictionary<NSString*, NSNumber*>* performance = nil;
static void ensureInitialised(void) {
  if (!performance) {
    performance = [NSMutableDictionary new];
  }
}

void UIDPerformanceSet(NSString* name, double ms) {
  ensureInitialised();
  [performance setObject:@(ms) forKey:name];
}
void UIDPerformanceAggregate(NSString* name, double ms) {
  ensureInitialised();
  NSNumber* existingMs = [performance objectForKey:name];
  if (existingMs) {
    ms += existingMs.doubleValue;
  }

  [performance setObject:@(ms) forKey:name];
}
NSDictionary<NSString*, NSNumber*>* UIDPerformanceGet(void) {
  ensureInitialised();
  return [performance copy];
}
void UIDPerformanceClear(void) {
  ensureInitialised();
  [performance removeAllObjects];
}

#ifdef __cplusplus
}
#endif

#endif
