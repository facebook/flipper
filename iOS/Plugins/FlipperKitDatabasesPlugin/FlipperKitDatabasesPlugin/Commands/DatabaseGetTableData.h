/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <Foundation/Foundation.h>

@interface DatabaseGetTableDataResponse : NSObject

@property(nonatomic, strong, readonly) NSArray<NSString*>* columns;
@property(nonatomic, strong, readonly) NSArray<NSArray*>* values;
@property(nonatomic, assign, readonly) NSInteger start;
@property(nonatomic, assign, readonly) NSInteger count;
@property(nonatomic, assign, readonly) NSInteger total;

- (instancetype)initWithColumns:(NSArray<NSString*>*)columns
                         values:(NSArray<NSArray*>*)values
                          start:(NSInteger)start
                          count:(NSInteger)count
                          total:(NSInteger)total;

@end

@interface DatabaseGetTableDataRequest : NSObject

@property(nonatomic, assign, readonly) NSInteger databaseId;
@property(nonatomic, copy, readonly) NSString* table;
@property(nonatomic, copy, readonly) NSString* order;
@property(nonatomic, assign, readonly) BOOL reverse;
@property(nonatomic, assign, readonly) NSInteger start;
@property(nonatomic, assign, readonly) NSInteger count;

- (instancetype)initWithDatabaseId:(NSInteger)databaseId
                             table:(NSString*)table
                             order:(NSString*)order
                           reverse:(BOOL)reverse
                             start:(NSInteger)start
                             count:(NSInteger)count;

+ (DatabaseGetTableDataRequest*)getTableDataRequestFromDictionary:
    (NSDictionary*)dictionary;

@end
