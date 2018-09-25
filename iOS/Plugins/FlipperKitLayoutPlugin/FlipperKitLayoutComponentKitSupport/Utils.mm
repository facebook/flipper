/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
#if FB_SONARKIT_ENABLED

#include "Utils.h"

NSString *relativeDimension(CKRelativeDimension dimension) {
  switch(dimension.type()) {
    case CKRelativeDimension::Type::PERCENT:
      return [NSString stringWithFormat: @"%@%%", @(dimension.value())];
    case CKRelativeDimension::Type::POINTS:
      return [NSString stringWithFormat: @"%@pt", @(dimension.value())];
    default:
      return @"auto";
  }
}

NSDictionary<NSString *, NSString *> *flexboxRect(CKFlexboxSpacing spacing) {
  return @{
    @"top": relativeDimension(spacing.top.dimension()),
    @"bottom": relativeDimension(spacing.bottom.dimension()),
    @"start": relativeDimension(spacing.start.dimension()),
    @"end": relativeDimension(spacing.end.dimension())
  };
}

#endif
