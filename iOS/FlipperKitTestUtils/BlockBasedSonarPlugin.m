/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "BlockBasedSonarPlugin.h"

@implementation BlockBasedSonarPlugin {
  NSString* _identifier;
  ConnectBlock _connect;
  DisconnectBlock _disconnect;
  BOOL _runInBackground;
}

- (instancetype)initIdentifier:(NSString*)identifier
                       connect:(ConnectBlock)connect
                    disconnect:(DisconnectBlock)disconnect {
  if (self = [super init]) {
    _identifier = identifier;
    _connect = connect;
    _disconnect = disconnect;
    _runInBackground = false;
  }
  return self;
}

- (instancetype)initIdentifier:(NSString*)identifier
                       connect:(ConnectBlock)connect
                    disconnect:(DisconnectBlock)disconnect
               runInBackground:(BOOL)runInBackground {
  if (self = [super init]) {
    _identifier = identifier;
    _connect = connect;
    _disconnect = disconnect;
    _runInBackground = runInBackground;
  }
  return self;
}

- (NSString*)identifier {
  return _identifier;
}

- (void)didConnect:(id<FlipperConnection>)connection {
  if (_connect) {
    _connect(connection);
  }
}

- (void)didDisconnect {
  if (_disconnect) {
    _disconnect();
  }
}

- (BOOL)runInBackground {
  return _runInBackground;
}

@end
