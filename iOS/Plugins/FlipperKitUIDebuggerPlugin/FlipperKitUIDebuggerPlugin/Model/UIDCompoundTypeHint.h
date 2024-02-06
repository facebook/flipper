/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

typedef NS_CLOSED_ENUM(NSInteger, UIDCompoundTypeHint) {
  UIDCompoundTypeHintNone,
  UIDCompoundTypeHintTop,
  UIDCompoundTypeHintLeft,
  UIDCompoundTypeHintRight,
  UIDCompoundTypeHintBottom,
  UIDCompoundTypeHintWidth,
  UIDCompoundTypeHintHeight,
  UIDCompoundTypeHintX,
  UIDCompoundTypeHintY,
  UIDCompoundTypeHintZ,
  UIDCompoundTypeHintColor,
};

#ifdef __cplusplus
extern "C" {
#endif
UIDCompoundTypeHint UIDCompoundTypeHintFromString(NSString* _Nullable string);
NSString* NSStringFromUIDCompoundTypeHint(UIDCompoundTypeHint hint);
#ifdef __cplusplus
}
#endif

NS_ASSUME_NONNULL_END

#endif
