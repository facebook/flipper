/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "NSDictionary+Foundation.h"
#import "NSSet+Foundation.h"
#import "UIDMetadata+Foundation.h"

FB_LINKABLE(UIDMetadata_Foundation)
@implementation UIDMetadata (Foundation)

- (id)toFoundation {
  NSMutableDictionary* result = [NSMutableDictionary dictionary];

  [result addEntriesFromDictionary:@{
    @"id" : self.identifier,
    @"type" : self.type,
    @"name" : self.name,
    @"mutable" : [NSNumber numberWithBool:self.isMutable],
  }];

  if (self.customAttributes != nil) {
    result[@"customAttributes"] = [self.customAttributes toFoundation];
  }

  return [result copy];
}

@end

#endif
