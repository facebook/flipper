/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import <FlipperKit/FlipperPlugin.h>
#import <Foundation/Foundation.h>
#import "DatabaseDriver.h"

@class DatabasesManager;

@interface FlipperKitDatabasesPlugin : NSObject<FlipperPlugin>
@property(nonatomic, strong) DatabasesManager* databasesManager;

- (instancetype)init NS_UNAVAILABLE;
+ (instancetype)sharedInstance;
- (void)addDatabaseDriver:(id<DatabaseDriver>)driver;
- (void)removeDatabaseDriver:(id<DatabaseDriver>)driver;

@end

#endif
