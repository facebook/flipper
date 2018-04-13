/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
#import "SonarConnectionMock.h"

@implementation SonarConnectionMock

- (instancetype)init
{
  if (self = [super init]) {
    _connected = YES;
    _receivers = @{};
    _sent = @{};
  }
  return self;
}


- (void)send:(NSString *)method withParams:(NSDictionary *)params
{
  if (_connected) {
    NSMutableDictionary *newSent = [NSMutableDictionary new];
    [newSent addEntriesFromDictionary:_sent];
    if (newSent[method]) {
      newSent[method] = [_sent[method] arrayByAddingObject:params];
    } else {
      newSent[method] = @[params];
    }
    _sent = newSent;
  }
}

- (void)receive:(NSString *)method withBlock:(SonarReceiver)receiver
{
  if (_connected) {
    NSMutableDictionary *newReceivers = [NSMutableDictionary new];
    [newReceivers addEntriesFromDictionary:_receivers];
    newReceivers[method] = receiver;
    _receivers = newReceivers;
  }
}

@end
