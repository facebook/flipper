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
