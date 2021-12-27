/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED

#include "Utils.h"

NSString* relativeDimension(CKRelativeDimension dimension) {
  switch (dimension.type()) {
    case CKRelativeDimension::Type::PERCENT:
      return [NSString stringWithFormat:@"%@%%", @(dimension.value())];
    case CKRelativeDimension::Type::POINTS:
      return [NSString stringWithFormat:@"%@pt", @(dimension.value())];
    default:
      return @"auto";
  }
}

CKRelativeDimension relativeStructDimension(NSString* dimension) {
  if ([dimension hasSuffix:@"%"]) {
    return CKRelativeDimension::Percent(
        [[dimension substringToIndex:([dimension length] - 1)] integerValue]);
  }
  if ([dimension hasSuffix:@"pt"]) {
    return CKRelativeDimension::Points(
        [[dimension substringToIndex:([dimension length] - 2)] integerValue]);
  }
  return CKRelativeDimension::Auto();
}

NSDictionary<NSString*, NSString*>* flexboxRect(CKFlexboxSpacing spacing) {
  return @{
    @"top" : relativeDimension(spacing.top.dimension()),
    @"bottom" : relativeDimension(spacing.bottom.dimension()),
    @"start" : relativeDimension(spacing.start.dimension()),
    @"end" : relativeDimension(spacing.end.dimension())
  };
}

NSDictionary<NSString*, NSString*>* ckcomponentSize(CKComponentSize size) {
  return @{
    @"width" : relativeDimension(size.width),
    @"height" : relativeDimension(size.height),
    @"minWidth" : relativeDimension(size.minWidth),
    @"minHeight" : relativeDimension(size.minHeight),
    @"maxWidth" : relativeDimension(size.maxWidth),
    @"maxHeight" : relativeDimension(size.maxHeight),
  };
}

#endif
