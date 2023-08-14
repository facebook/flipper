/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "DatabaseGetTableInfo.h"

@implementation DatabaseGetTableInfoResponse

- (instancetype)initWithDefinition:(NSString*)definition {
  self = [super init];
  if (self) {
    _definition = definition;
  }
  return self;
}

@end

@implementation DatabaseGetTableInfoRequest

- (instancetype)initWithDatabaseId:(NSInteger)databaseId
                             table:(NSString*)table {
  self = [super init];
  if (self) {
    _databaseId = databaseId;
    _table = [table copy];
  }
  return self;
}

+ (DatabaseGetTableInfoRequest*)getTableInfoRequestFromDictionary:
    (NSDictionary*)dictionary {
  NSNumber* databaseId = @([dictionary[@"databaseId"] integerValue]);
  NSString* table = dictionary[@"table"];
  if (databaseId == nil || table == nil) {
    return nil;
  }
  return [[DatabaseGetTableInfoRequest alloc]
      initWithDatabaseId:databaseId.intValue
                   table:table];
}

@end
