/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "DatabasesManager.h"
#import <FlipperKit/FlipperClient.h>
#import <FlipperKit/FlipperConnection.h>
#import <FlipperKit/FlipperResponder.h>
#include <Foundation/Foundation.h>
#import "DatabaseDescriptor.h"
#import "DatabaseDriver.h"

@interface DatabasesManager ()

@property(nonatomic, strong)
    NSMutableDictionary<NSNumber*, DatabaseDescriptorHolder*>*
        databaseDescriptorHolders;
@property(nonatomic, strong)
    NSMutableSet<DatabaseDescriptorHolder*>* databaseDescriptorHolderSet;

@end

@implementation DatabasesManager

- (instancetype)initWithDatabaseDrivers:
    (NSArray<id<DatabaseDriver>>*)databaseDrivers {
  self = [super init];
  if (self) {
    _databaseDrivers = [databaseDrivers copy];
    _databaseDescriptorHolders = [[NSMutableDictionary alloc] init];
    _databaseDescriptorHolderSet = [[NSMutableSet alloc] init];
  }
  return self;
}

- (void)setConnection:(id<FlipperConnection>)connection {
  _connection = connection;
  if (connection) {
    [self listenForCommands];
  }
}

- (BOOL)isConnected {
  return _connection != nil;
}

- (void)listenForCommands {
  [self.connection
        receive:@"databaseList"
      withBlock:^(NSDictionary* params, id<FlipperResponder> responder) {
        NSInteger databaseId = 1;
        [self.databaseDescriptorHolders removeAllObjects];
        [self.databaseDescriptorHolderSet removeAllObjects];

        for (id<DatabaseDriver> databaseDriver in self.databaseDrivers) {
          NSArray<id<DatabaseDescriptor>>* databaseDescriptorList =
              [databaseDriver getDatabases];
          for (id<DatabaseDescriptor> databaseDescriptor in
                   databaseDescriptorList) {
            DatabaseDescriptorHolder* databaseDescriptorHolder =
                [[DatabaseDescriptorHolder alloc]
                    initWithIdentifier:databaseId
                        databaseDriver:databaseDriver
                    databaseDescriptor:databaseDescriptor];
            self.databaseDescriptorHolders[@(databaseId)] =
                databaseDescriptorHolder;
            [self.databaseDescriptorHolderSet
                addObject:databaseDescriptorHolder];
            databaseId++;
          }
        }

        NSDictionary* result = [DatabasesManager
            databaseListToDictionary:self.databaseDescriptorHolderSet];
        [responder success:result];
      }];

  [self.connection
        receive:@"getTableData"
      withBlock:^(NSDictionary* params, id<FlipperResponder> responder){
      }];

  [self.connection
        receive:@"getTableStructure"
      withBlock:^(NSDictionary* params, id<FlipperResponder> responder){
      }];

  [self.connection
        receive:@"getTableInfo"
      withBlock:^(NSDictionary* params, id<FlipperResponder> responder){
      }];

  [self.connection
        receive:@"execute"
      withBlock:^(NSDictionary* params, id<FlipperResponder> responder){
      }];
}

+ (NSDictionary*)databaseListToDictionary:
    (NSSet<DatabaseDescriptorHolder*>*)databaseDescriptorHolderSet {
  NSMutableDictionary* resultDict = [NSMutableDictionary new];

  for (DatabaseDescriptorHolder* descriptorHolder in
           databaseDescriptorHolderSet) {
    NSArray<NSString*>* tableNameList = [descriptorHolder.databaseDriver
        getTableNames:descriptorHolder.databaseDescriptor];
    NSArray<NSString*>* sortedTableNames =
        [tableNameList sortedArrayUsingSelector:@selector(compare:)];
    NSString* idString =
        [NSString stringWithFormat:@"%ld", descriptorHolder.identifier];
    NSDictionary* databaseDict = @{
      @"id" : idString,
      @"name" : descriptorHolder.databaseDescriptor.name,
      @"tables" : sortedTableNames
    };
    [resultDict setObject:databaseDict forKey:idString];
  }

  return resultDict;
}

@end

@implementation DatabaseDescriptorHolder

- (instancetype)initWithIdentifier:(NSInteger)identifier
                    databaseDriver:(id<DatabaseDriver>)databaseDriver
                databaseDescriptor:(id<DatabaseDescriptor>)databaseDescriptor {
  self = [super init];
  if (self) {
    _identifier = identifier;
    _databaseDriver = databaseDriver;
    _databaseDescriptor = databaseDescriptor;
  }
  return self;
}

@end

@implementation ExecuteSqlRequest

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

@implementation GetTableDataRequest

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

@end

@implementation GetTableStructureRequest

- (instancetype)initWithDatabaseId:(NSInteger)databaseId
                             table:(NSString*)table {
  self = [super init];
  if (self) {
    _databaseId = databaseId;
    _table = [table copy];
  }
  return self;
}

@end

@implementation GetTableInfoRequest

- (instancetype)initWithDatabaseId:(NSInteger)databaseId
                             table:(NSString*)table {
  self = [super init];
  if (self) {
    _databaseId = databaseId;
    _table = [table copy];
  }
  return self;
}

@end
