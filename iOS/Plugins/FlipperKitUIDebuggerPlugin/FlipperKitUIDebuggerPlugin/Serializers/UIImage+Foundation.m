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

- (UIImage*)resizeImage:(UIImage*)image withRatio:(CGFloat)ratio {
  CGSize newSize =
      CGSizeMake(image.size.width * ratio, image.size.height * ratio);
  UIGraphicsBeginImageContextWithOptions(newSize, NO, 0.0);
  [image drawInRect:CGRectMake(0, 0, newSize.width, newSize.height)];
  UIImage* newImage = UIGraphicsGetImageFromCurrentImageContext();
  UIGraphicsEndImageContext();
  return newImage;
}

- (NSString*)toFoundation {
  uint64_t t0 = UIDPerformanceNow();

  UIImage* resized = [self resizeImage:self withRatio:0.5];
  uint64_t t1 = UIDPerformanceNow();
  UIDPerformanceAggregate(
      @"snapshotResizeMs", UIDMonotonicTimeConvertMachUnitsToMS(t1 - t0));

  NSData* data = UIImagePNGRepresentation(resized);
  NSString* base64 = [data
      base64EncodedStringWithOptions:NSDataBase64Encoding64CharacterLineLength];
  uint64_t t2 = UIDPerformanceNow();

  UIDPerformanceAggregate(
      @"snapshotSerialisationMS",
      UIDMonotonicTimeConvertMachUnitsToMS(t2 - t1));

  UIDPerformanceAggregate(@"snapshotSizeKB", base64.length / 1000);

  return base64;
}

@end

#endif
