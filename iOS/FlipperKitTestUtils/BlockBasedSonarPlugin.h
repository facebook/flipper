/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <Foundation/Foundation.h>

#import <FlipperKit/FlipperPlugin.h>

@protocol FlipperConnection;

typedef void (^ConnectBlock)(id<FlipperConnection>);
typedef void (^DisconnectBlock)(void);

@interface BlockBasedSonarPlugin : NSObject<FlipperPlugin>

- (instancetype)initIdentifier:(NSString*)identifier
                       connect:(ConnectBlock)connect
                    disconnect:(DisconnectBlock)disconnect;
- (instancetype)initIdentifier:(NSString*)identifier
                       connect:(ConnectBlock)connect
                    disconnect:(DisconnectBlock)disconnect
               runInBackground:(BOOL)runInBackground;

@end
