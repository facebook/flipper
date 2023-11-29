/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED

#import "UIDSubtreeUpdateEvent.h"

@implementation UIDSubtreeUpdateEvent

+ (NSString*)name {
  return @"subtreeUpdate";
}

@end

#endif
