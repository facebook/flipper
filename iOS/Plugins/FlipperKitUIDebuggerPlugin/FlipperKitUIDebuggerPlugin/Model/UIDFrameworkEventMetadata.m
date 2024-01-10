/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "UIDFrameworkEventMetadata.h"

@implementation UIDFrameworkEventMetadata

- (instancetype)initWithType:(NSString*)type
               documentation:(NSString*)documentation {
  if (self = [super init]) {
    self->_type = type;
    self->_documentation = documentation;
  }
  return self;
}

+ (instancetype)newWithType:(NSString*)type
              documentation:(NSString*)documentation {
  return [[self alloc] initWithType:type documentation:documentation];
}

@end

#endif
