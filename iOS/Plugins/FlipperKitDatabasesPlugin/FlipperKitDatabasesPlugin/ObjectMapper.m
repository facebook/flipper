/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "ObjectMapper.h"
#include <Foundation/Foundation.h>
#import "DatabaseDescriptorHolder.h"
#import "DatabaseExecuteSql.h"
#import "DatabaseGetTableData.h"
#import "DatabaseGetTableInfo.h"
#import "DatabaseGetTableStructure.h"

@implementation ObjectMapper

static const int MAX_BLOB_LENGTH = 100 * 1024;
static NSString* const UNKNOWN_BLOB_LABEL_FORMAT = @"{%d-byte %@ blob}";

+ (NSMutableArray*)databaseListToFlipperArray:
    (NSMutableSet<DatabaseDescriptorHolder*>*)databaseDescriptorHolderSet {
  NSMutableArray* result = [NSMutableArray new];

  for (DatabaseDescriptorHolder* holder in databaseDescriptorHolderSet) {
    NSArray<NSString*>* tables =
        [holder.databaseDriver getTableNames:holder.databaseDescriptor];
    NSArray<NSString*>* sortedTableNames =
        [tables sortedArrayUsingSelector:@selector(compare:)];
    NSString* idString = [NSString stringWithFormat:@"%ld", holder.identifier];

    NSDictionary* databaseInfo = @{
      @"id" : idString,
      @"name" : holder.databaseDescriptor.name,
      @"tables" : sortedTableNames
    };
    [result addObject:databaseInfo];
  }

  return result;
}

+ (NSDictionary*)databaseGetTableDataResponseToDictionary:
    (DatabaseGetTableDataResponse*)response {
  NSMutableArray* rows = [NSMutableArray array];
  for (NSArray* row in response.values) {
    NSMutableArray* rowValues = [NSMutableArray array];
    for (id item in row) {
      [rowValues addObject:[self objectAndTypeToFlipperObject:item]];
    }
    [rows addObject:rowValues];
  }

  return @{
    @"columns" : response.columns,
    @"values" : rows,
    @"start" : @(response.start),
    @"count" : @(response.count),
    @"total" : @(response.total)
  };
}

+ (NSDictionary*)errorWithCode:(NSInteger)code message:(NSString*)message {
  return @{@"code" : @(code), @"message" : message};
}

+ (NSDictionary*)databaseGetTableStructureResponseToDictionary:
    (DatabaseGetTableStructureResponse*)response {
  NSMutableArray* structureValues = [NSMutableArray array];
  for (NSArray* row in response.structureValues) {
    NSMutableArray* rowValues = [NSMutableArray array];
    for (id item in row) {
      [rowValues addObject:[self objectAndTypeToFlipperObject:item]];
    }
    [structureValues addObject:rowValues];
  }

  NSMutableArray* indexesValues = [NSMutableArray array];
  for (NSArray* row in response.indexesValues) {
    NSMutableArray* rowValues = [NSMutableArray array];
    for (id item in row) {
      [rowValues addObject:[self objectAndTypeToFlipperObject:item]];
    }
    [indexesValues addObject:rowValues];
  }

  return @{
    @"structureColumns" : response.structureColumns,
    @"structureValues" : structureValues,
    @"indexesColumns" : response.indexesColumns,
    @"indexesValues" : indexesValues
  };
}

+ (NSDictionary*)databaseGetTableInfoResponseToDictionary:
    (DatabaseGetTableInfoResponse*)response {
  return @{
    @"definition" : response.definition,
  };
}

+ (NSDictionary*)databaseExecuteSqlResponseToDictionary:
    (DatabaseExecuteSqlResponse*)response {
  NSMutableArray* rows = [NSMutableArray array];
  if (response.values) {
    for (NSArray* row in response.values) {
      NSMutableArray* rowValues = [NSMutableArray array];
      for (id item in row) {
        [rowValues addObject:[self objectAndTypeToFlipperObject:item]];
      }
      [rows addObject:rowValues];
    }
  }

  NSMutableDictionary* result = [NSMutableDictionary dictionaryWithDictionary:@{
    @"type" : response.type,
    @"columns" : response.columns,
    @"values" : rows,
    @"affectedCount" : @(response.affectedCount)
  }];

  if (response.insertedId) {
    result[@"insertedId"] = response.insertedId;
  }

  return result;
}

+ (NSDictionary*)objectAndTypeToFlipperObject:(id)object {
  if (!object || [object isKindOfClass:[NSNull class]]) {
    return @{@"type" : @"null"};
  } else if ([object isKindOfClass:[NSNumber class]]) {
    NSNumber* number = (NSNumber*)object;
    NSString* type = [NSString stringWithUTF8String:[number objCType]];

    if ([type isEqualToString:@"i"]) {
      return @{@"type" : @"integer", @"value" : number};
    } else if ([type isEqualToString:@"f"] || [type isEqualToString:@"d"]) {
      return @{@"type" : @"float", @"value" : number};
    } else if ([type isEqualToString:@"B"]) {
      return @{@"type" : @"boolean", @"value" : number};
    } else {
      return @{@"type" : @"integer", @"value" : @([number integerValue])};
    }

    return @{@"type" : @"integer", @"value" : object};
  } else if ([object isKindOfClass:[NSDecimalNumber class]]) {
    return @{@"type" : @"float", @"value" : object};
  } else if ([object isKindOfClass:[NSString class]]) {
    return @{@"type" : @"string", @"value" : object};
  } else if ([object isKindOfClass:[NSData class]]) {
    NSString* blobString = [self blobToString:(NSData*)object];
    return @{@"type" : @"blob", @"value" : blobString};
  } else if ([object isKindOfClass:[NSDictionary class]]) {
    // Usualy the dictionary is a Json blob, and we can parse it as string.
    NSError* error;
    NSData* jsonData = [NSJSONSerialization dataWithJSONObject:object
                                                       options:0
                                                         error:&error];
    if (!jsonData) {
      NSString* reason = [NSString
          stringWithFormat:@"NSDictionary is not in a json format: %@",
                           [error localizedDescription]];
      @throw [NSException exceptionWithName:@"InvalidArgumentException"
                                     reason:reason
                                   userInfo:nil];
    }

    NSString* jsonString = [[NSString alloc] initWithData:jsonData
                                                 encoding:NSUTF8StringEncoding];
    return @{@"type" : @"blob", @"value" : jsonString};

  } else if ([object isKindOfClass:[NSValue class]]) {
    return @{@"type" : @"boolean", @"value" : object};
  } else {
    @throw [NSException exceptionWithName:@"InvalidArgumentException"
                                   reason:@"type of Object is invalid"
                                 userInfo:nil];
  }
}

+ (NSString*)blobToString:(NSData*)data {
  const uint8_t* bytes = data.bytes;
  uint length = data.length;

  if (length <= MAX_BLOB_LENGTH) {
    if ([self fastIsAscii:bytes length:length]) {
      NSStringEncoding encoding = NSASCIIStringEncoding;
      return [[NSString alloc] initWithBytesNoCopy:(void*)bytes
                                            length:length
                                          encoding:encoding
                                      freeWhenDone:NO];
    } else {
      // try UTF-8
      NSStringEncoding encoding = NSUTF8StringEncoding;
      return [[NSString alloc] initWithBytesNoCopy:(void*)bytes
                                            length:length
                                          encoding:encoding
                                      freeWhenDone:NO];
    }
  }
  return
      [NSString stringWithFormat:UNKNOWN_BLOB_LABEL_FORMAT, length, @"binary"];
}

+ (BOOL)fastIsAscii:(const uint8_t*)bytes length:(NSUInteger)length {
  for (int i = 0; i < length; i++) {
    uint8_t b = bytes[i];
    if ((b & ~0x7f) != 0) {
      return NO;
    }
  }
  return YES;
}

@end
