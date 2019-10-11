/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED

#import "FlipperKitReactPlugin.h"

#import <FlipperKit/FlipperClient.h>
#import <FlipperKit/FlipperConnection.h>
#import <FlipperKit/FlipperResponder.h>

@implementation FlipperKitReactPlugin

- (NSString*)identifier {
  return @"React";
}

- (void)didConnect:(id<FlipperConnection>)connection {
  [connection receive:@"config"
            withBlock:^(NSDictionary* params, id<FlipperResponder> responder){
                // set received port and host to dev tools
            }];
}

- (void)didDisconnect {
}

@end

#endif
