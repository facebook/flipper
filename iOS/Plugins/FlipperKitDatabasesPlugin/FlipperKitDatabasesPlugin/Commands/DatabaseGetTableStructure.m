/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "DatabaseGetTableStructure.h"

@implementation DatabaseGetTableStructureResponse

- (instancetype)
    initWithStructureColumns:(NSArray<NSString*>*)structureColumns
             structureValues:(NSArray<NSArray<NSString*>*>*)structureValues
              indexesColumns:(NSArray<NSString*>*)indexesColumns
               indexesValues:(NSArray<NSArray<NSString*>*>*)indexesValues {
  self = [super init];
  if (self) {
    _structureColumns = [structureColumns copy];
    _structureValues = [structureValues copy];
    _indexesColumns = [indexesColumns copy];
    _indexesValues = [indexesValues copy];
  }
  return self;
}

@end

@implementation DatabaseGetTableStructureRequest

- (instancetype)initWithDatabaseId:(NSInteger)databaseId
                             table:(NSString*)table {
  self = [super init];
  if (self) {
    _databaseId = databaseId;
    _table = [table copy];
  }
  return self;
}

+ (DatabaseGetTableStructureRequest*)getTableStructureRequestFromDictionary:
    (NSDictionary*)params {
  int databaseId = [params[@"databaseId"] integerValue];
  NSString* table = params[@"table"];
  if (databaseId <= 0 || !table) {
    return nil;
  }
  return [[DatabaseGetTableStructureRequest alloc] initWithDatabaseId:databaseId
                                                                table:table];
}

@end
