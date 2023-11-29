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

- (instancetype)init;
- (void)setConnection:(id<FlipperConnection>)connection;
- (BOOL)isConnected;
- (void)addDatabaseDriver:(id<DatabaseDriver>)driver;
- (void)removeDatabaseDriver:(id<DatabaseDriver>)driver;

@end
