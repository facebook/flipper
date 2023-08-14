/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED
#import "FlipperKitDatabasesPlugin.h"
#import <FlipperKit/FlipperClient.h>
#import <FlipperKit/FlipperConnection.h>
#import <FlipperKit/FlipperResponder.h>

@interface FlipperKitDatabasesPlugin ()
@property(strong, nonatomic) id<FlipperConnection> connection;

@end

@implementation FlipperKitDatabasesPlugin

- (instancetype)init {
  if (self = [super init]) {
  }
  return self;
}

+ (instancetype)sharedInstance {
  static FlipperKitDatabasesPlugin* sInstance = nil;

  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    sInstance = [FlipperKitDatabasesPlugin new];
  });

  return sInstance;
}

- (void)didConnect:(id<FlipperConnection>)connection {
  self.connection = connection;

  // Define connection event handlers

  // databaseList
  [connection
        receive:@"databaseList"
      withBlock:^(NSDictionary* params, id<FlipperResponder> responder) {
        NSMutableDictionary* response = [NSMutableDictionary dictionary];

        response[@1] = @{
          @"id" : @1,
          @"name" : @"Provider1",
          @"tables" : @[ @"Table1_1", @"Table1_2", @"Table1_3" ]
        };
        response[@2] = @{
          @"id" : @2,
          @"name" : @"Provider2",
          @"tables" : @[ @"Table2_1", @"Table2_2" ]
        };
        response[@3] =
            @{@"id" : @3,
              @"name" : @"Provider3",
              @"tables" : @[ @"Table3_1" ]};
        [responder success:response];
      }];

  // getTableData
  [connection receive:@"getTableData"
            withBlock:^(NSDictionary* params, id<FlipperResponder> responder){

            }];

  // getTableStructure
  [connection receive:@"getTableStructure"
            withBlock:^(NSDictionary* params, id<FlipperResponder> responder){
            }];

  // getTableInfo
  [connection receive:@"getTableInfo"
            withBlock:^(NSDictionary* params, id<FlipperResponder> responder){
            }];

  // execute
  [connection receive:@"execute"
            withBlock:^(NSDictionary*, id<FlipperResponder> responder){
            }];
}

- (void)didDisconnect {
  self.connection = nil;
}

- (NSString*)identifier {
  return @"Databases";
}

- (BOOL)runInBackground {
  return YES;
}

@end

#endif
