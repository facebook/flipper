/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "UIDTraversalMode.h"

static NSString* kUIDTraversalModeViewHierarchyValue = @"view-hierarchy";

static NSString* kUIDTraversalModeAccessibilityHierarchyValue =
    @"accessibility-hierarchy";

UIDTraversalMode UIDTraversalModeFromString(NSString* string) {
  if ([string isEqualToString:kUIDTraversalModeAccessibilityHierarchyValue]) {
    return UIDTraversalModeAccessibilityHierarchy;
  }
  return UIDTraversalModeViewHierarchy;
}

NSString* NSStringFromUIDTraversalMode(UIDTraversalMode mode) {
  switch (mode) {
    case UIDTraversalModeViewHierarchy:
      return kUIDTraversalModeViewHierarchyValue;
    case UIDTraversalModeAccessibilityHierarchy:
      return kUIDTraversalModeAccessibilityHierarchyValue;
  }
}

#endif
