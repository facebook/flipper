/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "DatabaseDescriptorHolder.h"

@implementation DatabaseDescriptorHolder

- (instancetype)initWithIdentifier:(NSInteger)identifier
                    databaseDriver:(id<DatabaseDriver>)databaseDriver
                databaseDescriptor:(id<DatabaseDescriptor>)databaseDescriptor {
  self = [super init];
  if (self) {
    _identifier = identifier;
    _databaseDriver = databaseDriver;
    _databaseDescriptor = databaseDescriptor;
  }
  return self;
}

@end
