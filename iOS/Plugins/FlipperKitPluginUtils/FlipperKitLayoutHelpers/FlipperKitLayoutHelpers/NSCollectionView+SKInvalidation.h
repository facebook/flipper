/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if TARGET_OS_OSX

#import <AppKit/AppKit.h>

#import <FlipperKit/SKMacros.h>

FB_LINK_REQUIRE_CATEGORY(NSCollectionView_SKInvalidation)
@interface NSCollectionView (SKInvalidation)

+ (void)enableInvalidations;

@end

#endif
