/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED
#import "FlipperKitBloksPlugin.h"
#import <FlipperKit/FlipperClient.h>
#import <FlipperKit/FlipperConnection.h>
#import <FlipperKit/FlipperResponder.h>
#import "Plugins.h"

@implementation FlipperKitBloksPlugin {
  id<FlipperConnection> _connection;
}

- (void)didConnect:(id<FlipperConnection>)connection {
  _connection = connection;
}

- (void)didDisconnect {
  _connection = nil;
}

- (NSString*)identifier {
  return @"flipper-plugin-ntstate";
}

- (BOOL)runInBackground {
  return YES;
}

- (void)logAction:(NSString*)action withData:(NSDictionary*)data {
  [_connection send:action withParams:data];
}

@end

void IGBloksFlipperPluginInit(FlipperClient* client) {
  [client addPlugin:[FlipperKitBloksPlugin new]];
}

#endif
