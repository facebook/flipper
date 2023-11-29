/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <Foundation/Foundation.h>
#include <objc/NSObjCRuntime.h>

@interface DatabaseExecuteSqlResponse : NSObject

@property(nonatomic, strong) NSString* type;
@property(nonatomic, strong) NSArray* columns;
@property(nonatomic, strong) NSArray* values;
@property(nonatomic, strong) NSNumber* insertedId;
@property(nonatomic, assign) NSInteger affectedCount;

- (instancetype)initWithType:(NSString*)type
                     columns:(NSArray*)columns
                      values:(NSArray*)values
                  insertedId:(NSNumber*)insertedId
               affectedCount:(NSInteger)affectedCount;

@end

@interface DatabaseExecuteSqlRequest : NSObject

@property(nonatomic, assign, readonly) NSInteger databaseId;
@property(nonatomic, copy, readonly) NSString* value;

- (instancetype)initWithDatabaseId:(NSInteger)databaseId value:(NSString*)value;
+ (DatabaseExecuteSqlRequest*)getExecuteSqlRequestFromDictionary:
    (NSDictionary*)dictionary;

@end
