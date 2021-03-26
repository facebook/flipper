/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <FlipperKitLayoutHelpers/SKTapListener.h>

@interface SKTapListenerMock : NSObject<SKTapListener>

- (void)tapAt:(CGPoint)point;

@end
