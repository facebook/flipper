/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
#import <Foundation/Foundation.h>

@interface SKPortForwardingServer : NSObject

- (instancetype)init;

- (void)listenForMultiplexingChannelOnPort:(NSUInteger)port;
- (void)forwardConnectionsFromPort:(NSUInteger)port;
- (void)close;

@end
