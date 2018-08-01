/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

#import "SKRequestInfo.h"

@implementation SKRequestInfo

- (instancetype)initWithIdentifier:(int64_t)identifier timestamp:(uint64_t)timestamp request:(NSURLRequest *)request data:(NSData *)data{

  if (self = [super init]){
    _identifier = identifier;
    _timestamp = timestamp;
    _request = request;
    _body = data ? [data base64EncodedStringWithOptions: 0]
    : [request.HTTPBody base64EncodedStringWithOptions: 0];
  }
  return self;
}

@end
