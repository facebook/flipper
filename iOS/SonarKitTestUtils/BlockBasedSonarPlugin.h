/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
#import <Foundation/Foundation.h>

#import <FlipperKit/FlipperPlugin.h>

@protocol FlipperConnection;

typedef void (^ConnectBlock)(id<FlipperConnection>);
typedef void (^DisconnectBlock)();

@interface BlockBasedSonarPlugin : NSObject<FlipperPlugin>

- (instancetype)initIdentifier:(NSString *)identifier connect:(ConnectBlock)connect disconnect:(DisconnectBlock)disconnect;

@end
