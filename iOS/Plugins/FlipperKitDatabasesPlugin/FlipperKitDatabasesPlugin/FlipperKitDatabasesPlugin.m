/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED
#import "FlipperKitDatabasesPlugin.h"
#import <FlipperKit/FlipperClient.h>
#import <FlipperKit/FlipperConnection.h>
#import <FlipperKit/FlipperResponder.h>
#import "DatabaseDriver.h"
#import "DatabasesManager.h"
#import "MockDatabaseDriver.h"

@interface FlipperKitDatabasesPlugin ()
@property(strong, nonatomic) id<FlipperConnection> connection;

@end

@implementation FlipperKitDatabasesPlugin

- (instancetype)init {
  if (self = [super init]) {
    _databasesManager = [DatabasesManager new];
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
  [self.databasesManager setConnection:connection];
}

- (void)didDisconnect {
  [self.databasesManager setConnection:nil];
}

- (NSString*)identifier {
  return @"Databases";
}

- (BOOL)runInBackground {
  return NO;
}

- (void)addDatabaseDriver:(id<DatabaseDriver>)driver {
  [self.databasesManager addDatabaseDriver:driver];
}

- (void)removeDatabaseDriver:(id<DatabaseDriver>)driver {
  [self.databasesManager addDatabaseDriver:driver];
}

@end

#endif
