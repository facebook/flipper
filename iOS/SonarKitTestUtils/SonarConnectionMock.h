/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
#import <Foundation/Foundation.h>

#import <SonarKit/SonarConnection.h>

@interface SonarConnectionMock : NSObject<SonarConnection>

@property (nonatomic, assign, getter=isConnected) BOOL connected;
@property (nonatomic, readonly) NSDictionary<NSString *, SonarReceiver> *receivers;
@property (nonatomic, readonly) NSDictionary<NSString *, NSArray<NSDictionary *> *> *sent;

@end
