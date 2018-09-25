/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
#import "SonarResponderMock.h"

@implementation SonarResponderMock

- (instancetype)init
{
  if (self = [super init]) {
    _successes = @[];
    _errors = @[];
  }
  return self;
}

- (void)success:(NSDictionary *)response
{
  _successes = [_successes arrayByAddingObject:response];
}

- (void)error:(NSDictionary *)response
{
  _errors = [_errors arrayByAddingObject:response];
}

@end
