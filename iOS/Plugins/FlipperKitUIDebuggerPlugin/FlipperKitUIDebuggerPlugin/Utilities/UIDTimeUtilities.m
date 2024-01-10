/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "UIDTimeUtilities.h"
#include <mach/mach_time.h>

#ifdef __cplusplus
extern "C" {
#endif

static mach_timebase_info_data_t _get_timebase(void) {
  static mach_timebase_info_data_t machInfo;
  static dispatch_once_t machInfoOnceToken = 0;
  dispatch_once(&machInfoOnceToken, ^{
    const int ret = mach_timebase_info(&machInfo);
    if (ret != KERN_SUCCESS) {
      machInfo.numer = 0;
      machInfo.denom = 1;
    }
  });
  return machInfo;
}

double UIDMonotonicTimeConvertMachUnitsToMS(uint64_t elapsed) {
  const mach_timebase_info_data_t tb_info = _get_timebase();
  return (double)elapsed * (double)tb_info.numer / (double)tb_info.denom /
      (1000.0 * 1000.0);
}

double UIDPerformanceTimeIntervalSince1970(void) {
  return [[NSDate date] timeIntervalSince1970];
}

double UIDTimeIntervalToMS(NSTimeInterval timeInterval) {
  return (timeInterval * 1000);
}

uint64_t UIDPerformanceNow(void) {
  return mach_absolute_time();
}

#ifdef __cplusplus
}
#endif

#endif
