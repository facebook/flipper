/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "NSString+Foundation.h"

FB_LINKABLE(NSString_Foundation)
@implementation NSString (Foundation)

- (id)toFoundation {
  return self;
}

@end

#endif
