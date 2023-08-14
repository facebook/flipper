/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <Foundation/Foundation.h>

@interface DatabaseGetTableInfoResponse : NSObject

@property(nonatomic, strong) NSString* definition;

- (instancetype)initWithDefinition:(NSString*)definition;

@end

@interface DatabaseGetTableInfoRequest : NSObject

@property(nonatomic, assign, readonly) NSInteger databaseId;
@property(nonatomic, copy, readonly) NSString* table;

- (instancetype)initWithDatabaseId:(NSInteger)databaseId table:(NSString*)table;
+ (DatabaseGetTableInfoRequest*)getTableInfoRequestFromDictionary:
    (NSDictionary*)dictionary;

@end
