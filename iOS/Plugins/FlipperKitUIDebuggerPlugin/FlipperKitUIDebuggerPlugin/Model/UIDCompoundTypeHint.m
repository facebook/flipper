/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "UIDCompoundTypeHint.h"

static NSString* kUUIDCompoundTypeHintTopValue = @"TOP";
static NSString* kUUIDCompoundTypeHintLeftValue = @"LEFT";
static NSString* kUUIDCompoundTypeHintRightValue = @"RIGHT";
static NSString* kUUIDCompoundTypeHintBottomValue = @"BOTTOM";
static NSString* kUUIDCompoundTypeHintWidthValue = @"WIDTH";
static NSString* kUUIDCompoundTypeHintHeightValue = @"HEIGHT";
static NSString* kUUIDCompoundTypeHintXValue = @"X";
static NSString* kUUIDCompoundTypeHintYValue = @"Y";
static NSString* kUUIDCompoundTypeHintZValue = @"Z";
static NSString* kUUIDCompoundTypeHintColorValue = @"COLOR";
static NSString* kUUIDCompoundTypeHintNoneValue = @"NONE";

UIDCompoundTypeHint UIDCompoundTypeHintFromString(NSString* _Nullable string) {
  if ([string isEqualToString:kUUIDCompoundTypeHintTopValue]) {
    return UIDCompoundTypeHintTop;
  } else if ([string isEqualToString:kUUIDCompoundTypeHintLeftValue]) {
    return UIDCompoundTypeHintLeft;
  } else if ([string isEqualToString:kUUIDCompoundTypeHintRightValue]) {
    return UIDCompoundTypeHintRight;
  } else if ([string isEqualToString:kUUIDCompoundTypeHintBottomValue]) {
    return UIDCompoundTypeHintBottom;
  } else if ([string isEqualToString:kUUIDCompoundTypeHintWidthValue]) {
    return UIDCompoundTypeHintWidth;
  } else if ([string isEqualToString:kUUIDCompoundTypeHintHeightValue]) {
    return UIDCompoundTypeHintHeight;
  } else if ([string isEqualToString:kUUIDCompoundTypeHintXValue]) {
    return UIDCompoundTypeHintX;
  } else if ([string isEqualToString:kUUIDCompoundTypeHintYValue]) {
    return UIDCompoundTypeHintY;
  } else if ([string isEqualToString:kUUIDCompoundTypeHintZValue]) {
    return UIDCompoundTypeHintZ;
  } else if ([string isEqualToString:kUUIDCompoundTypeHintColorValue]) {
    return UIDCompoundTypeHintColor;
  }

  return UIDCompoundTypeHintNone;
}

NSString* NSStringFromUIDCompoundTypeHint(UIDCompoundTypeHint hint) {
  switch (hint) {
    case UIDCompoundTypeHintTop:
      return kUUIDCompoundTypeHintTopValue;
    case UIDCompoundTypeHintLeft:
      return kUUIDCompoundTypeHintLeftValue;
    case UIDCompoundTypeHintRight:
      return kUUIDCompoundTypeHintRightValue;
    case UIDCompoundTypeHintBottom:
      return kUUIDCompoundTypeHintBottomValue;
    case UIDCompoundTypeHintWidth:
      return kUUIDCompoundTypeHintWidthValue;
    case UIDCompoundTypeHintHeight:
      return kUUIDCompoundTypeHintHeightValue;
    case UIDCompoundTypeHintX:
      return kUUIDCompoundTypeHintXValue;
    case UIDCompoundTypeHintY:
      return kUUIDCompoundTypeHintYValue;
    case UIDCompoundTypeHintZ:
      return kUUIDCompoundTypeHintZValue;
    case UIDCompoundTypeHintColor:
      return kUUIDCompoundTypeHintColorValue;
    case UIDCompoundTypeHintNone:
      return kUUIDCompoundTypeHintNoneValue;
  }
}

#endif
