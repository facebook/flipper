/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if TARGET_OS_OSX
#if FB_SONARKIT_ENABLED

#import "NSCollectionView+SKInvalidation.h"

#import "SKInvalidation.h"
#import "SKSwizzle.h"

FB_LINKABLE(NSCollectionView_SKInvalidation)
@implementation NSCollectionView (SKInvalidation)

+ (void)enableInvalidations {
}

@end

#endif // FB_SONARKIT_ENABLED
#endif
