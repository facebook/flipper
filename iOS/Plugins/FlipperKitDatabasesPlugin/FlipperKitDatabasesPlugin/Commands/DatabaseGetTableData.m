/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "DatabaseGetTableData.h"

@implementation DatabaseGetTableDataResponse

- (instancetype)initWithColumns:(NSArray<NSString*>*)columns
                         values:(NSArray<NSArray*>*)values
                          start:(NSInteger)start
                          count:(NSInteger)count
                          total:(NSInteger)total {
  self = [super init];
  if (self) {
    _columns = [columns copy];
    _values = [values copy];
    _start = start;
    _count = count;
    _total = total;
  }
  return self;
}

@end

@implementation DatabaseGetTableDataRequest

- (instancetype)initWithDatabaseId:(NSInteger)databaseId
                             table:(NSString*)table
                             order:(NSString*)order
                           reverse:(BOOL)reverse
                             start:(NSInteger)start
                             count:(NSInteger)count {
  self = [super init];
  if (self) {
    _databaseId = databaseId;
    _table = [table copy];
    _order = [order copy];
    _reverse = reverse;
    _start = start;
    _count = count;
  }
  return self;
}

+ (DatabaseGetTableDataRequest*)getTableDataRequestFromDictionary:
    (NSDictionary*)dictionary {
  NSInteger databaseId = [dictionary[@"databaseId"] integerValue];
  NSString* table = dictionary[@"table"];
  NSString* order = dictionary[@"order"];
  BOOL reverse = [dictionary[@"reverse"] boolValue];
  NSInteger start = [dictionary[@"start"] integerValue];
  NSInteger count = [dictionary[@"count"] integerValue];
  if (databaseId <= 0 || table.length == 0) {
    return nil;
  }
  return [[DatabaseGetTableDataRequest alloc] initWithDatabaseId:databaseId
                                                           table:table
                                                           order:order
                                                         reverse:reverse
                                                           start:start
                                                           count:count];
}

@end
