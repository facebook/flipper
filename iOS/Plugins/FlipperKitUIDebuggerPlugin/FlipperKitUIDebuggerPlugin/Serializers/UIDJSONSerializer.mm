/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "UIDJSONSerializer.h"
#import "NSArray+Foundation.h"
#import "NSDictionary+Foundation.h"
#import "NSObject+Foundation.h"
#import "NSSet+Foundation.h"
#import "UIDBounds+Foundation.h"
#import "UIDEdgeInsets+Foundation.h"
#import "UIDInspectable+Foundation.h"
#import "UIDInspectableArray+Foundation.h"
#import "UIDInspectableObject+Foundation.h"
#import "UIDInspectableValue+Foundation.h"
#import "UIDMetadata+Foundation.h"
#import "UIDNode+Foundation.h"
#import "UIDPerformance.h"
#import "UIDTimeUtilities.h"
#import "UIImage+Foundation.h"

#ifdef __cplusplus
extern "C" {
#endif
id UID_toFoundation(id<UIDFoundation> object) {
  return [object toFoundation];
}

NSString* UID_FoundationtoJSON(id object) {
  NSError* error = NULL;
  if (![NSJSONSerialization isValidJSONObject:object]) {
    return @"";
  }

  uint64_t t0 = UIDPerformanceNow();

  NSData* data = [NSJSONSerialization dataWithJSONObject:object
                                                 options:0
                                                   error:&error];
  uint64_t t1 = UIDPerformanceNow();

  UIDPerformanceAggregate(
      @"serialisationBinaryMS", UIDMonotonicTimeConvertMachUnitsToMS(t1 - t0));

  NSString* JSON = [[NSString alloc] initWithData:data
                                         encoding:NSUTF8StringEncoding];

  uint64_t t2 = UIDPerformanceNow();

  UIDPerformanceAggregate(
      @"serialisationEncodingMS",
      UIDMonotonicTimeConvertMachUnitsToMS(t2 - t1));

  return JSON;
}

NSString* UID_toJSON(id object) {
  return UID_FoundationtoJSON(UID_toFoundation(object));
}
#ifdef __cplusplus
}
#endif

#endif
