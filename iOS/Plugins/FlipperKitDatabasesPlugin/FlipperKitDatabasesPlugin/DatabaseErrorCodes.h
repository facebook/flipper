/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <Foundation/Foundation.h>

typedef NS_ENUM(NSInteger, DatabasesErrorCodes) {
  DatabasesErrorCodesInvalidRequest = 1,
  DatabasesErrorCodesDatabaseInvalid = 2,
  DatabasesErrorCodesSqlExecutionException = 3,
};

static NSString* const kDatabasesErrorCodesInvalidRequestMessage =
    @"The request received was invalid";
static NSString* const kDatabasesErrorCodesDatabaseInvalidMessage =
    @"Could not access database";
static NSString* const kDatabasesErrorCodesSqlExecutionExceptionMessage =
    @"SQL execution exception: ";
