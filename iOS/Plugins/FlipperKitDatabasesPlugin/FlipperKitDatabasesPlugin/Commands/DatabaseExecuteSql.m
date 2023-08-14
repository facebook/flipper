/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "DatabaseExecuteSql.h"

@implementation DatabaseExecuteSqlResponse

- (instancetype)initWithType:(NSString*)type
                     columns:(NSArray*)columns
                      values:(NSArray*)values
                  insertedId:(NSNumber*)insertedId
               affectedCount:(NSInteger)affectedCount {
  self = [super init];
  if (self) {
    _type = type;
    _columns = [columns copy];
    _values = [values copy];
    _insertedId = insertedId;
    _affectedCount = affectedCount;
  }
  return self;
}

@end

@implementation DatabaseExecuteSqlRequest

- (instancetype)initWithDatabaseId:(NSInteger)databaseId
                             value:(NSString*)value {
  self = [super init];
  if (self) {
    _databaseId = databaseId;
    _value = [value copy];
  }
  return self;
}

@end
