/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
#import <UIKit/UIKit.h>

#import <SonarKit/SKMacros.h>

FB_LINK_REQUIRE(UICollectionView_SKInvalidation)
@interface UICollectionView (SKInvalidation)

+ (void)enableInvalidations;

@end
