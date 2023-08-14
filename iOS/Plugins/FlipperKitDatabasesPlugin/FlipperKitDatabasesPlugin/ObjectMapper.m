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

+ (NSDictionary*)databaseListToDictionary:
    (NSMutableSet<DatabaseDescriptorHolder*>*)databaseDescriptorHolderSet {
  NSMutableDictionary* result = [NSMutableDictionary new];

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
    [result setObject:databaseInfo forKey:idString];
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
  return @{};
}

+ (NSDictionary*)databaseGetTableInfoResponseToDictionary:
    (DatabaseGetTableInfoResponse*)response {
  return @{};
}

+ (NSDictionary*)databaseExecuteSqlResponseToDictionary:
    (DatabaseExecuteSqlResponse*)response {
  return @{};
}

@end
