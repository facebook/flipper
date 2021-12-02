/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <Foundation/Foundation.h>

@interface FKPortForwardingClient : NSObject

- (instancetype)init;

- (void)forwardConnectionsToPort:(NSUInteger)port;
- (void)connectToMultiplexingChannelOnPort:(NSUInteger)port;
- (void)close;

@end
