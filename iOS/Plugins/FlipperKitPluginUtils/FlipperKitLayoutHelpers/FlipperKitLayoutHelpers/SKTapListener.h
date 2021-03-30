/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <TargetConditionals.h>

#if TARGET_OS_IPHONE
#import <UIKit/UIKit.h>
#elif TARGET_OS_OSX
#import <AppKit/AppKit.h>
#import <Foundation/Foundation.h>
#endif

typedef void (^SKTapReceiver)(CGPoint touchPoint);

@protocol SKTapListener

@property(nonatomic, readonly) BOOL isMounted;

- (void)mountWithFrame:(CGRect)frame;

- (void)unmount;

- (void)listenForTapWithBlock:(SKTapReceiver)receiver;

@end
