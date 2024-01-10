/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import <cmath>
#import "UIDBounds.h"
#import "UIDEdgeInsets+Foundation.h"
#import "UIDInspectableValue+Foundation.h"

static auto CGFloatToNSNumber(CGFloat x) -> NSNumber* {
#if CGFLOAT_IS_DOUBLE
  return [NSNumber numberWithDouble:x];
#else
  return [NSNumber numberWithFloat:x];
#endif
}

static auto boxedNumber(CGFloat x) -> NSObject* {
  if (std::isinf(x)) {
    return @"Infinity";
  }

  if (std::isnan(x)) {
    return @"NaN";
  }

  return CGFloatToNSNumber(x);
}

FB_LINKABLE(UIDInspectableText_Foundation)
@implementation UIDInspectableText (Foundation)

- (id)toFoundation {
  return @{
    @"type" : @"text",
    @"value" : self.value ?: @"null",
  };
}

@end

FB_LINKABLE(UIDInspectableNumber_Foundation)
@implementation UIDInspectableNumber (Foundation)

- (id)toFoundation {
  return @{
    @"type" : @"number",
    @"value" : std::isinf([self.value doubleValue]) ? @"Infinity" : self.value,
  };
}

@end

FB_LINKABLE(UIDInspectableBoolean_Foundation)
@implementation UIDInspectableBoolean (Foundation)

- (id)toFoundation {
  return @{
    @"type" : @"boolean",
    @"value" : [NSNumber numberWithBool:self.value],
  };
}

@end

FB_LINKABLE(UIDInspectableBounds_Foundation)
@implementation UIDInspectableBounds (Foundation)

- (id)toFoundation {
  return @{
    @"type" : @"bounds",
    @"value" : @{
      @"x" : CGFloatToNSNumber(self.value.x),
      @"y" : CGFloatToNSNumber(self.value.y),
      @"width" : CGFloatToNSNumber(self.value.width),
      @"height" : CGFloatToNSNumber(self.value.height),
    },
  };
}

@end

FB_LINKABLE(UIDInspectableSize_Foundation)
@implementation UIDInspectableSize (Foundation)

- (id)toFoundation {
  return @{
    @"type" : @"size",
    @"value" : @{
      @"width" : boxedNumber(self.value.width),
      @"height" : boxedNumber(self.value.height),
    },
  };
}

@end

FB_LINKABLE(UIDInspectableCoordinate_Foundation)
@implementation UIDInspectableCoordinate (Foundation)

- (id)toFoundation {
  return @{
    @"type" : @"coordinate",
    @"value" : @{
      @"x" : CGFloatToNSNumber(self.value.x),
      @"y" : CGFloatToNSNumber(self.value.y),
    },
  };
}

@end

FB_LINKABLE(UIDInspectableEdgeInsets_Foundation)
@implementation UIDInspectableEdgeInsets (Foundation)

- (id)toFoundation {
  return @{
    @"type" : @"space",
    @"value" : [self.value toFoundation],
  };
}

@end

FB_LINKABLE(UIDInspectableColor_Foundation)
@implementation UIDInspectableColor (Foundation)

- (id)toFoundation {
  CGFloat red = 0;
  CGFloat green = 0;
  CGFloat blue = 0;
  CGFloat alpha = 0;

  [self.value getRed:&red green:&green blue:&blue alpha:&alpha];

  red *= 255;
  green *= 255;
  blue *= 255;
  alpha = 0;

  return @{
    @"type" : @"color",
    @"value" : @{
      @"r" : [NSNumber numberWithLong:red],
      @"g" : [NSNumber numberWithLong:green],
      @"b" : [NSNumber numberWithLong:blue],
      @"a" : [NSNumber numberWithLong:alpha],
    },
  };
}

@end

FB_LINKABLE(UIDInspectableUnknown_Foundation)
@implementation UIDInspectableUnknown (Foundation)

- (id)toFoundation {
  return @{
    @"type" : @"unknown",
    @"value" : self.value ?: @"unknown",
  };
}

@end

FB_LINKABLE(UIDInspectableEnum_Foundation)
@implementation UIDInspectableEnum (Foundation)

- (id)toFoundation {
  return @{
    @"type" : @"enum",
    @"value" : self.value,
  };
}

@end

#endif
