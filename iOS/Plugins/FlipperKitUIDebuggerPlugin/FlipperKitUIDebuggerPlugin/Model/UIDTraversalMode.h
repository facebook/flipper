/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

typedef NS_CLOSED_ENUM(NSInteger, UIDTraversalMode) {
  UIDTraversalModeViewHierarchy,
  UIDTraversalModeAccessibilityHierarchy,
};

#ifdef __cplusplus
extern "C" {
#endif
UIDTraversalMode UIDTraversalModeFromString(NSString* string);
NSString* NSStringFromUIDTraversalMode(UIDTraversalMode mode);
#ifdef __cplusplus
}
#endif

NS_ASSUME_NONNULL_END

#endif
