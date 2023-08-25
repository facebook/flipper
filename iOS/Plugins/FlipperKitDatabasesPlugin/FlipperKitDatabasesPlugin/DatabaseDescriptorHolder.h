/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <Foundation/Foundation.h>
#import "DatabaseDescriptor.h"
#import "DatabaseDriver.h"

@interface DatabaseDescriptorHolder : NSObject

@property(nonatomic, assign, readonly) NSInteger identifier;
@property(nonatomic, strong, readonly) id<DatabaseDriver> databaseDriver;
@property(nonatomic, strong, readonly) id<DatabaseDescriptor>
    databaseDescriptor;

- (instancetype)initWithIdentifier:(NSInteger)identifier
                    databaseDriver:(id<DatabaseDriver>)databaseDriver
                databaseDescriptor:(id<DatabaseDescriptor>)databaseDescriptor;

@end
