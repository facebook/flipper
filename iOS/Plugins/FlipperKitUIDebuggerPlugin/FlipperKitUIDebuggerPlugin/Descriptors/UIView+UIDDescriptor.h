/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import <FlipperKit/SKMacros.h>
#import <FlipperKitUIDebuggerPlugin/UIDDescriptor.h>
#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

FB_LINK_REQUIRE_CATEGORY(UIView_UIDDescriptor)
@interface UIView (UIDDescriptor)<UIDDescriptor>

@end

NS_ASSUME_NONNULL_END

#endif
