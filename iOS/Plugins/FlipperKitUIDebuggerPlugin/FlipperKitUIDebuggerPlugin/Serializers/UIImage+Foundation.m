/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "UIDPerformance.h"
#import "UIDTimeUtilities.h"
#import "UIImage+Foundation.h"

FB_LINKABLE(UIImage_Foundation)
@implementation UIImage (Foundation)

- (NSString*)toFoundation {
  uint64_t t0 = UIDPerformanceNow();
  NSData* data = UIImagePNGRepresentation(self);
  NSString* base64 = [data
      base64EncodedStringWithOptions:NSDataBase64Encoding64CharacterLineLength];
  uint64_t t1 = UIDPerformanceNow();

  UIDPerformanceAggregate(
      @"snapshotSerialisationMS",
      UIDMonotonicTimeConvertMachUnitsToMS(t1 - t0));

  return base64;
}

@end

#endif
