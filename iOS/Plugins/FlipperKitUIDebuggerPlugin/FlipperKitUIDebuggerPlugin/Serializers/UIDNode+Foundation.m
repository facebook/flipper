/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "NSDictionary+Foundation.h"
#import "UIDBounds+Foundation.h"
#import "UIDNode+Foundation.h"

FB_LINKABLE(UIDNode_Foundation)
@implementation UIDNode (Foundation)

- (id)toFoundation {
  NSMutableDictionary* data = [NSMutableDictionary dictionaryWithDictionary:@{
    @"id" : self.identifier,
    @"qualifiedName" : self.qualifiedName ?: @"",
    @"name" : self.name,
    @"bounds" : [self.bounds toFoundation],
    @"tags" : self.tags ? self.tags.allObjects : @[],
    @"inlineAttributes" : self.inlineAttributes ?: @{},
    @"children" : self.children,
  }];

  if (self.activeChild) {
    [data setObject:self.activeChild forKey:@"activeChild"];
  }
  if (self.attributes) {
    [data setObject:[self.attributes toFoundation] forKey:@"attributes"];
  }
  if (self.hiddenAttributes) {
    [data setObject:[self.hiddenAttributes toFoundation]
             forKey:@"hiddenAttributes"];
  }
  if (self.parent) {
/* @cwt-override FIXME[T168581563]: -Wnullable-to-nonnull-conversion */
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wnullable-to-nonnull-conversion"
    [data setObject:self.parent forKey:@"parent"];
#pragma clang diagnostic pop
  }

  return data;
}

@end

#endif
