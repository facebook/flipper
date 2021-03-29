/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if TARGET_OS_OSX

#import <FlipperKit/SKMacros.h>

FB_LINK_REQUIRE_CATEGORY(NSView_SKInvalidation)
@interface NSView (SKInvalidation)

+ (void)enableInvalidation;

@end

#endif
