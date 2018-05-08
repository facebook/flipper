/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
#import "BlockBasedSonarPlugin.h"

@implementation BlockBasedSonarPlugin
{
  NSString *_identifier;
  ConnectBlock _connect;
  DisconnectBlock _disconnect;
}

- (instancetype)initIdentifier:(NSString *)identifier connect:(ConnectBlock)connect disconnect:(DisconnectBlock)disconnect
{
  if (self = [super init]) {
    _identifier = identifier;
    _connect = connect;
    _disconnect = disconnect;
  }
  return self;
}

- (NSString *)identifier
{
  return _identifier;
}

- (void)didConnect:(id<SonarConnection>)connection
{
  if (_connect) {
    _connect(connection);
  }
}

- (void)didDisconnect
{
  if (_connect) {
    _disconnect();
  }
}

@end
