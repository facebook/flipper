/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED

#import <FlipperKit/SKMacros.h>
#import <UIKit/UIKit.h>
#import "UIDFoundation.h"

NS_ASSUME_NONNULL_BEGIN

FB_LINK_REQUIRE_CATEGORY(UIImage_Foundation)
@interface UIImage (Foundation)<UIDFoundation>

@end

NS_ASSUME_NONNULL_END

#endif
