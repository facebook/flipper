/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
#import <SonarKitLayoutPlugin/SKTapListener.h>

@interface SKTapListenerMock : NSObject<SKTapListener>

- (void)tapAt:(CGPoint)point;

@end
