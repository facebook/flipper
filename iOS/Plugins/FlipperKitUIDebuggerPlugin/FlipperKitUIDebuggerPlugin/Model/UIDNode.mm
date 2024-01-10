/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "UIDNode.h"

@implementation UIDNode

- (instancetype)initWithIdentifier:(NSUInteger)identifier
                     qualifiedName:(NSString*)qualifiedName
                              name:(NSString*)name
                            bounds:(UIDBounds*)bounds
                              tags:(NSSet<NSString*>*)tags {
  self = [super init];
  if (self) {
    self.identifier = identifier;
    self.qualifiedName = qualifiedName;
    self.name = name;
    self.bounds = bounds;
    self.tags = tags;
    self.parent = nil;
    self.children = [NSArray array];
    self.attributes = [NSDictionary dictionary];
  }

  return self;
}

@end

#endif
