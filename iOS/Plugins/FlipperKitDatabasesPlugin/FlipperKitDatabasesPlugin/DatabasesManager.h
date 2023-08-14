/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <Foundation/Foundation.h>

@protocol DatabaseDriver;
@protocol DatabaseDescriptor;
@protocol FlipperConnection;

@interface DatabasesManager : NSObject

@property(nonatomic, strong) id<FlipperConnection> connection;
@property(nonatomic, strong, readonly)
    NSArray<id<DatabaseDriver>>* databaseDrivers;

- (instancetype)initWithDatabaseDrivers:
    (NSArray<id<DatabaseDriver>>*)databaseDrivers;
- (void)setConnection:(id<FlipperConnection>)connection;
- (BOOL)isConnected;

@end

@interface DatabaseDescriptorHolder : NSObject

@property(nonatomic, assign, readonly) NSInteger identifier;
@property(nonatomic, strong, readonly) id<DatabaseDriver> databaseDriver;
@property(nonatomic, strong, readonly) id<DatabaseDescriptor>
    databaseDescriptor;

- (instancetype)initWithIdentifier:(NSInteger)identifier
                    databaseDriver:(id<DatabaseDriver>)databaseDriver
                databaseDescriptor:(id<DatabaseDescriptor>)databaseDescriptor;

@end

@interface ExecuteSqlRequest : NSObject

@property(nonatomic, assign, readonly) NSInteger databaseId;
@property(nonatomic, copy, readonly) NSString* value;

- (instancetype)initWithDatabaseId:(NSInteger)databaseId value:(NSString*)value;

@end

@interface GetTableDataRequest : NSObject

@property(nonatomic, assign, readonly) NSInteger databaseId;
@property(nonatomic, copy, readonly) NSString* table;
@property(nonatomic, copy, readonly) NSString* order;
@property(nonatomic, assign, readonly) BOOL reverse;
@property(nonatomic, assign, readonly) NSInteger start;
@property(nonatomic, assign, readonly) NSInteger count;

- (instancetype)initWithDatabaseId:(NSInteger)databaseId
                             table:(NSString*)table
                             order:(NSString*)order
                           reverse:(BOOL)reverse
                             start:(NSInteger)start
                             count:(NSInteger)count;

@end

@interface GetTableStructureRequest : NSObject

@property(nonatomic, assign, readonly) NSInteger databaseId;
@property(nonatomic, copy, readonly) NSString* table;

- (instancetype)initWithDatabaseId:(NSInteger)databaseId table:(NSString*)table;

@end

@interface GetTableInfoRequest : NSObject

@property(nonatomic, assign, readonly) NSInteger databaseId;
@property(nonatomic, copy, readonly) NSString* table;

- (instancetype)initWithDatabaseId:(NSInteger)databaseId table:(NSString*)table;

@end
