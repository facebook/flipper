/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <Foundation/Foundation.h>

@protocol DatabaseDescriptor;
@class DatabaseGetTableInfoResponse;
@class DatabaseGetTableStructureResponse;

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
@end
