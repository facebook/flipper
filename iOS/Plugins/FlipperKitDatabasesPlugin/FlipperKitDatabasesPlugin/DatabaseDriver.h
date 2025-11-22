/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <Foundation/Foundation.h>

@protocol DatabaseDescriptor;
@class DatabaseGetTableStructureResponse;
@class DatabaseGetTableInfoResponse;
@class DatabaseGetTableDataResponse;
@class DatabaseExecuteSqlResponse;

@protocol DatabaseDriver<NSObject>
- (NSArray<id<DatabaseDescriptor>>*)getDatabases;
- (NSArray<NSString*>*)getTableNames:(id<DatabaseDescriptor>)databaseDescriptor;
- (DatabaseGetTableStructureResponse*)
    getTableStructureWithDatabaseDescriptor:
        (id<DatabaseDescriptor>)databaseDescriptor
                                   forTable:(NSString*)tableName;
- (DatabaseGetTableInfoResponse*)
    getTableInfoWithDatabaseDescriptor:
        (id<DatabaseDescriptor>)databaseDescriptor
                              forTable:(NSString*)tableName;

- (DatabaseGetTableDataResponse*)
    getTableDataWithDatabaseDescriptor:
        (id<DatabaseDescriptor>)databaseDescriptor
                              forTable:(NSString*)tableName
                                 order:(NSString*)order
                               reverse:(BOOL)reverse
                                 start:(NSInteger)start
                                 count:(NSInteger)count;
- (DatabaseExecuteSqlResponse*)
    executeSQLWithDatabaseDescriptor:
        (id<DatabaseDescriptor>)databaseDescriptor
                                 sql:(NSString*)sql;
@end
