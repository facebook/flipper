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
  // TODO(fulvioabrahao) implement commands.
  [self.connection
        receive:@"databaseList"
      withBlock:^(NSDictionary* params, id<FlipperResponder> responder){
      }];
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
