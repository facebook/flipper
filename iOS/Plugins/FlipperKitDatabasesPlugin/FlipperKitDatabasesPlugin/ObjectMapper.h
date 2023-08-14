/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <Foundation/Foundation.h>

@class DatabaseDescriptorHolder;
@class DatabaseExecuteSqlResponse;
@class DatabaseGetTableDataResponse;
@class DatabaseGetTableInfoResponse;
@class DatabaseGetTableStructureResponse;

@interface ObjectMapper : NSObject

+ (NSDictionary*)databaseListToDictionary:
    (NSMutableSet<DatabaseDescriptorHolder*>*)databaseDescriptorHolderSet;
+ (NSDictionary*)databaseGetTableDataResponseToDictionary:
    (DatabaseGetTableDataResponse*)response;
+ (NSDictionary*)databaseGetTableStructureResponseToDictionary:
    (DatabaseGetTableStructureResponse*)response;
+ (NSDictionary*)databaseGetTableInfoResponseToDictionary:
    (DatabaseGetTableInfoResponse*)response;
+ (NSDictionary*)databaseExecuteSqlResponseToDictionary:
    (DatabaseExecuteSqlResponse*)response;
+ (NSDictionary*)errorWithCode:(NSInteger)code message:(NSString*)message;

@end
