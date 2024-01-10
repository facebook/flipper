/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import <Foundation/Foundation.h>

#ifdef __cplusplus
extern "C" {
#endif
void UIDPerformanceSet(NSString* name, double ms);
void UIDPerformanceAggregate(NSString* name, double ms);
NSDictionary<NSString*, NSNumber*>* UIDPerformanceGet(void);
void UIDPerformanceClear(void);

#ifdef __cplusplus
}
#endif

#endif
