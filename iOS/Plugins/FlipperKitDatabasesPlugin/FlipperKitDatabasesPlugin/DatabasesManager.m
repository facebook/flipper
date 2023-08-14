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
#import "DatabaseGetTableStructure.h"
#import "ObjectMapper.h"

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

        NSDictionary* result = [ObjectMapper
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
        receive:@"getTableStructure"
      withBlock:^(NSDictionary* params, id<FlipperResponder> responder){
      }];

  [self.connection
        receive:@"execute"
      withBlock:^(NSDictionary* params, id<FlipperResponder> responder){
      }];
}

@end
