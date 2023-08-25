/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "MockDatabaseDriver.h"
#include <Foundation/Foundation.h>
#include <objc/NSObjCRuntime.h>
#import "DatabaseExecuteSql.h"
#import "DatabaseGetTableData.h"
#import "DatabaseGetTableInfo.h"
#import "DatabaseGetTableStructure.h"
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

- (DatabaseGetTableStructureResponse*)
    getTableStructureWithDatabaseDescriptor:
        (id<DatabaseDescriptor>)databaseDescriptor
                                   forTable:(NSString*)tableName {
  NSMutableArray<NSString*>* structureColumns =
      [NSMutableArray arrayWithObjects:@"id", @"name", @"age", nil];
  NSMutableArray<NSArray<NSString*>*>* structureValues =
      [NSMutableArray arrayWithObjects:@[ @"1", @"John", @"25" ],
                                       @[ @"2", @"Jane", @"30" ],
                                       nil];
  NSMutableArray<NSString*>* indexesColumns = [NSMutableArray
      arrayWithObjects:@"index_name", @"unique", @"indexed_column_name", nil];
  NSMutableArray<NSArray<NSString*>*>* indexesValues = [NSMutableArray
      arrayWithObjects:@[ @"index_name1", @"false", @"id,name" ],
                       @[ @"index_name2", @"true", @"age" ],
                       nil];

  return [[DatabaseGetTableStructureResponse alloc]
      initWithStructureColumns:[structureColumns copy]
               structureValues:[structureValues copy]
                indexesColumns:[indexesColumns copy]
                 indexesValues:[indexesValues copy]];
}

- (DatabaseGetTableInfoResponse*)
    getTableInfoWithDatabaseDescriptor:
        (id<DatabaseDescriptor>)databaseDescriptor
                              forTable:(NSString*)tableName {
  return [[DatabaseGetTableInfoResponse alloc]
      initWithDefinition:@"This is mocked table definition"];
}

- (DatabaseGetTableDataResponse*)
    getTableDataWithDatabaseDescriptor:
        (id<DatabaseDescriptor>)databaseDescriptor
                              forTable:(NSString*)tableName
                                 order:(NSString*)order
                               reverse:(BOOL)reverse
                                 start:(NSInteger)start
                                 count:(NSInteger)count {
  NSMutableArray* columns = [NSMutableArray array];
  NSMutableArray* values = [NSMutableArray array];
  NSUInteger numColums = 10;
  NSUInteger numRows = 100;
  for (int i = 0; i < numColums; i++) {
    NSString* columnName = [NSString stringWithFormat:@"column%d", i + 1];
    [columns addObject:columnName];
  }

  for (int i = 0; i < numRows; i++) {
    NSMutableArray* valueRow = [NSMutableArray array];
    for (int j = 0; j < numColums; j++) {
      [valueRow addObject:[NSString stringWithFormat:@"value%d", j]];
    }
    [values addObject:valueRow];
  }

  return [[DatabaseGetTableDataResponse alloc] initWithColumns:[columns copy]
                                                        values:[values copy]
                                                         start:0
                                                         count:numRows
                                                         total:numRows];
}

- (DatabaseExecuteSqlResponse*)executeSQL:(NSString*)sql {
  // Generate a mock response with a random type
  NSString* type;
  NSArray* columns = @[ @"id", @"name", @"age" ];
  NSMutableArray* values = [NSMutableArray array];
  NSUInteger numRows = 100;
  for (int i = 0; i < numRows; i++) {
    NSUInteger randomAge = arc4random_uniform(40);
    [values addObject:@[
      @(i),
      [NSString stringWithFormat:@"Name %d", i],
      @(randomAge)
    ]];
  }

  // Randomly select a type
  NSArray<NSString*>* types = @[ @"select", @"insert", @"update_delete" ];
  int index = arc4random_uniform((u_int32_t)types.count);
  type = types[index];

  // Set affectedCount and insertedId based on type
  NSInteger affectedCount = 0;
  NSNumber* insertedId = nil;
  if ([type isEqualToString:@"insert"]) {
    affectedCount = 1;
    insertedId = @(15);
  } else if ([type isEqualToString:@"update_delete"]) {
    affectedCount = values.count;
  }

  DatabaseExecuteSqlResponse* response =
      [[DatabaseExecuteSqlResponse alloc] initWithType:type
                                               columns:columns
                                                values:[values copy]
                                            insertedId:insertedId
                                         affectedCount:affectedCount];

  return response;
}

@end
