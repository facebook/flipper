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
#import "DatabaseDescriptorHolder.h"
#import "DatabaseDriver.h"
#import "DatabaseErrorCodes.h"
#import "DatabaseExecuteSql.h"
#import "DatabaseGetTableData.h"
#import "DatabaseGetTableInfo.h"
#import "DatabaseGetTableStructure.h"
#import "ObjectMapper.h"

@interface DatabasesManager ()

@property(nonatomic, strong)
    NSMutableDictionary<NSNumber*, DatabaseDescriptorHolder*>*
        databaseDescriptorHolders;
@property(nonatomic, strong)
    NSMutableSet<DatabaseDescriptorHolder*>* databaseDescriptorHolderSet;
@property(nonatomic, strong) NSMutableSet<id<DatabaseDriver>>* databaseDrivers;

@end

@implementation DatabasesManager

- (instancetype)init {
  self = [super init];
  if (self) {
    _databaseDrivers = [NSMutableSet new];
    _databaseDescriptorHolders = [NSMutableDictionary new];
    _databaseDescriptorHolderSet = [NSMutableSet new];
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

        id result = [ObjectMapper
            databaseListToFlipperArray:self.databaseDescriptorHolderSet];
        [responder success:result];
      }];

  [self.connection
        receive:@"getTableData"
      withBlock:^(NSDictionary* params, id<FlipperResponder> responder) {
        DatabaseGetTableDataRequest* request = [DatabaseGetTableDataRequest
            getTableDataRequestFromDictionary:params];
        if (!request) {
          [DatabasesManager raiseInvalidRequestError:responder];
          return;
        }
        DatabaseDescriptorHolder* descriptorHolder =
            self.databaseDescriptorHolders[@(request.databaseId)];
        if (!descriptorHolder) {
          [DatabasesManager raiseDatabaseInvalidError:responder];
          return;
        }

        @try {
          DatabaseGetTableDataResponse* tableDataResponse =
              [descriptorHolder.databaseDriver
                  getTableDataWithDatabaseDescriptor:descriptorHolder
                                                         .databaseDescriptor
                                            forTable:request.table
                                               order:request.order
                                             reverse:request.reverse
                                               start:request.start
                                               count:request.count];
          NSDictionary* response = [ObjectMapper
              databaseGetTableDataResponseToDictionary:tableDataResponse];
          [responder success:response];
        } @catch (NSException* exception) {
          NSString* reason = exception.reason ?: @"Unknown error";
          NSDictionary* errorResponse = [ObjectMapper
              errorWithCode:DatabasesErrorCodesSqlExecutionException
                    message:[kDatabasesErrorCodesSqlExecutionExceptionMessage
                                stringByAppendingString:reason]];
          [responder error:errorResponse];
        }
      }];

  [self.connection
        receive:@"getTableStructure"
      withBlock:^(NSDictionary* params, id<FlipperResponder> responder) {
        DatabaseGetTableStructureRequest* request =
            [DatabaseGetTableStructureRequest
                getTableStructureRequestFromDictionary:params];

        if (!request) {
          [DatabasesManager raiseInvalidRequestError:responder];
          return;
        }
        DatabaseDescriptorHolder* descriptorHolder =
            self.databaseDescriptorHolders[@(request.databaseId)];
        if (!descriptorHolder) {
          [DatabasesManager raiseDatabaseInvalidError:responder];
          return;
        }

        @try {
          DatabaseGetTableStructureResponse* tableStructure =
              [descriptorHolder.databaseDriver
                  getTableStructureWithDatabaseDescriptor:
                      descriptorHolder.databaseDescriptor
                                                 forTable:request.table];
          NSDictionary* response = [ObjectMapper
              databaseGetTableStructureResponseToDictionary:tableStructure];
          [responder success:response];
        } @catch (NSException* exception) {
          NSString* reason = exception.reason ?: @"Unknown error";
          NSDictionary* errorResponse = [ObjectMapper
              errorWithCode:DatabasesErrorCodesSqlExecutionException
                    message:[kDatabasesErrorCodesSqlExecutionExceptionMessage
                                stringByAppendingString:reason]];
          [responder error:errorResponse];
        }
      }];

  [self.connection
        receive:@"getTableInfo"
      withBlock:^(NSDictionary* params, id<FlipperResponder> responder) {
        DatabaseGetTableInfoRequest* request = [DatabaseGetTableInfoRequest
            getTableInfoRequestFromDictionary:params];
        if (!request) {
          [DatabasesManager raiseInvalidRequestError:responder];
          return;
        }
        DatabaseDescriptorHolder* descriptorHolder =
            self.databaseDescriptorHolders[@(request.databaseId)];
        if (!descriptorHolder) {
          [DatabasesManager raiseDatabaseInvalidError:responder];
          return;
        }

        @try {
          DatabaseGetTableInfoResponse* tableInfo =
              [descriptorHolder.databaseDriver
                  getTableInfoWithDatabaseDescriptor:descriptorHolder
                                                         .databaseDescriptor
                                            forTable:request.table];
          NSDictionary* response =
              [ObjectMapper databaseGetTableInfoResponseToDictionary:tableInfo];
          [responder success:response];
        } @catch (NSException* exception) {
          NSString* reason = exception.reason ?: @"Unknown error";
          NSDictionary* errorResponse = [ObjectMapper
              errorWithCode:DatabasesErrorCodesSqlExecutionException
                    message:[kDatabasesErrorCodesSqlExecutionExceptionMessage
                                stringByAppendingString:reason]];
          [responder error:errorResponse];
        }
      }];

  [self.connection
        receive:@"execute"
      withBlock:^(NSDictionary* params, id<FlipperResponder> responder) {
        DatabaseExecuteSqlRequest* request = [DatabaseExecuteSqlRequest
            getExecuteSqlRequestFromDictionary:params];
        if (!request) {
          [DatabasesManager raiseInvalidRequestError:responder];
          return;
        }
        DatabaseDescriptorHolder* descriptorHolder =
            self.databaseDescriptorHolders[@(request.databaseId)];
        if (!descriptorHolder) {
          [DatabasesManager raiseDatabaseInvalidError:responder];
          return;
        }
        @try {
          DatabaseExecuteSqlResponse* sqlResponse =
              [descriptorHolder.databaseDriver
                    executeSQLWithDatabaseDescriptor:descriptorHolder
                                                         .databaseDescriptor
                                                 sql:request.value];
          NSDictionary* response =
              [ObjectMapper databaseExecuteSqlResponseToDictionary:sqlResponse];
          [responder success:response];
        } @catch (NSException* exception) {
          NSString* reason = exception.reason ?: @"Unknown error";
          NSDictionary* errorResponse = [ObjectMapper
              errorWithCode:DatabasesErrorCodesSqlExecutionException
                    message:[kDatabasesErrorCodesSqlExecutionExceptionMessage
                                stringByAppendingString:reason]];
          [responder error:errorResponse];
        }
      }];
}

- (void)addDatabaseDriver:(id<DatabaseDriver>)driver {
  if ([self.databaseDrivers containsObject:driver]) {
    return;
  }
  [self.databaseDrivers addObject:driver];
}

- (void)removeDatabaseDriver:(id<DatabaseDriver>)driver {
  if (![self.databaseDrivers containsObject:driver]) {
    return;
  }
  [self.databaseDrivers removeObject:driver];
}

+ (void)raiseInvalidRequestError:(id<FlipperResponder>)responder {
  NSDictionary* errorResponse =
      [ObjectMapper errorWithCode:DatabasesErrorCodesInvalidRequest
                          message:kDatabasesErrorCodesInvalidRequestMessage];
  [responder error:errorResponse];
}

+ (void)raiseDatabaseInvalidError:(id<FlipperResponder>)responder {
  NSDictionary* errorResponse =
      [ObjectMapper errorWithCode:DatabasesErrorCodesDatabaseInvalid
                          message:kDatabasesErrorCodesDatabaseInvalidMessage];
  [responder error:errorResponse];
}

@end
