/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "MockDatabaseDriver.h"
#import "MockDatabaseDescriptor.h"

@implementation MockDatabaseDriver

- (NSArray<id<DatabaseDescriptor>>*)getDatabases {
  MockDatabaseDescriptor* mockDescriptor =
      [[MockDatabaseDescriptor alloc] init];
  return @[ mockDescriptor ];
}

- (NSArray<NSString*>*)getTableNames:
    (id<DatabaseDescriptor>)databaseDescriptor {
  return @[ @"MockTable1", @"MockTable2" ];
}

@synthesize databaseDescriptor;

@end
