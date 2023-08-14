/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "MockDatabaseDriver.h"
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
  for (int i = 0; i < 100; i++) {
    NSString* columnName = [NSString stringWithFormat:@"column%d", i + 1];
    [columns addObject:columnName];
    NSArray* valueRow = @[ @"value1", @"value2", @"value3" ];
    [values addObject:valueRow];
  }

  return [[DatabaseGetTableDataResponse alloc] initWithColumns:[columns copy]
                                                        values:[values copy]
                                                         start:0
                                                         count:100
                                                         total:100];
}

@end
