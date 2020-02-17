/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED

#import "SKSubDescriptor.h"
#import "SKComponentLayoutWrapper.h"

@implementation SKSubDescriptor {
}

- (NSDictionary<NSString*, NSObject*>*)getDataForNode:
    (SKComponentLayoutWrapper*)node {
  return @{};
}

- (NSString*)getName {
  return @"";
}

@end

#endif
