/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if TARGET_OS_OSX
#if FB_SONARKIT_ENABLED

#import "NSColor+SKSonarValueCoder.h"

FB_LINKABLE(NSColor_SonarValueCoder)
@implementation NSColor (SonarValueCoder)

+ (instancetype)fromSonarValue:(NSNumber*)sonarValue {
  NSUInteger intColor = [sonarValue integerValue];

  CGFloat r, g, b, a;

  b = CGFloat(intColor & 0xFF) / 255;
  g = CGFloat((intColor >> 8) & 0xFF) / 255;
  r = CGFloat((intColor >> 16) & 0xFF) / 255;
  a = CGFloat((intColor >> 24) & 0xFF) / 255;

  return [NSColor colorWithRed:r green:g blue:b alpha:a];
}

- (NSDictionary<NSString*, id<NSObject>>*)sonarValue {
  CGColorSpaceRef colorSpace = CGColorGetColorSpace([self CGColor]);
  CGColorSpaceModel colorSpaceModel = CGColorSpaceGetModel(colorSpace);

  NSUInteger red, green, blue, alpha;

  switch (colorSpaceModel) {
    case kCGColorSpaceModelUnknown:
    case kCGColorSpaceModelRGB: {
      CGFloat r, g, b, a;
      [self getRed:&r green:&g blue:&b alpha:&a];

      red = (NSUInteger)(r * 255) & 0xFF;
      green = (NSUInteger)(g * 255) & 0xFF;
      blue = (NSUInteger)(b * 255) & 0xFF;
      alpha = (NSUInteger)(a * 255) & 0xFF;
    } break;

    case kCGColorSpaceModelMonochrome: {
      CGFloat a, w;
      [self getWhite:&w alpha:&a];

      red = green = blue = (NSUInteger)(w * 255) & 0xFF;
      alpha = (NSUInteger)(a * 255) & 0xFF;
    } break;

    default:
      red = green = blue = alpha = 0;
  }

  NSUInteger intColor = (alpha << 24) | (red << 16) | (green << 8) | blue;
  return
      @{@"__type__" : @"color", @"__mutable__" : @NO, @"value" : @(intColor)};
}

@end

#endif // FB_SONARKIT_ENABLED
#endif
