/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <Foundation/Foundation.h>

@protocol DatabaseDescriptor;

@protocol DatabaseDriver<NSObject>
@property(nonatomic, strong, readonly) id<DatabaseDescriptor>
    databaseDescriptor;

- (NSArray<id<DatabaseDescriptor>>*)getDatabases;
- (NSArray<NSString*>*)getTableNames:(id<DatabaseDescriptor>)databaseDescriptor;

@end
