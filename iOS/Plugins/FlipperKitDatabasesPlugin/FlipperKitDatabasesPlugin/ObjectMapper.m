/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "ObjectMapper.h"
#include <Foundation/Foundation.h>
#import "DatabaseDescriptorHolder.h"
#import "DatabaseExecuteSql.h"
#import "DatabaseGetTableData.h"
#import "DatabaseGetTableInfo.h"
#import "DatabaseGetTableStructure.h"

@implementation ObjectMapper

+ (NSMutableArray*)databaseListToFlipperArray:
    (NSMutableSet<DatabaseDescriptorHolder*>*)databaseDescriptorHolderSet {
  NSMutableArray* result = [NSMutableArray new];

  for (DatabaseDescriptorHolder* holder in databaseDescriptorHolderSet) {
    NSArray<NSString*>* tables =
        [holder.databaseDriver getTableNames:holder.databaseDescriptor];
    NSArray<NSString*>* sortedTableNames =
        [tables sortedArrayUsingSelector:@selector(compare:)];
    NSString* idString = [NSString stringWithFormat:@"%ld", holder.identifier];

    NSDictionary* databaseInfo = @{
      @"id" : idString,
      @"name" : holder.databaseDescriptor.name,
      @"tables" : sortedTableNames
    };
    [result addObject:databaseInfo];
  }

  return result;
}

+ (NSDictionary*)databaseGetTableDataResponseToDictionary:
    (DatabaseGetTableDataResponse*)response {
  return @{};
}

+ (NSDictionary*)errorWithCode:(NSInteger)code message:(NSString*)message {
  return @{@"code" : @(code), @"message" : message};
}

+ (NSDictionary*)databaseGetTableStructureResponseToDictionary:
    (DatabaseGetTableStructureResponse*)response {
  return @{
    @"structureColumns" : response.structureColumns,
    @"structureValues" : response.structureValues,
    @"indexesColumns" : response.indexesColumns,
    @"indexesValues" : response.indexesValues
  };
}

+ (NSDictionary*)databaseGetTableInfoResponseToDictionary:
    (DatabaseGetTableInfoResponse*)response {
  return @{
    @"definition" : response.definition,
  };
}

+ (NSDictionary*)databaseExecuteSqlResponseToDictionary:
    (DatabaseExecuteSqlResponse*)response {
  return @{};
}

@end
