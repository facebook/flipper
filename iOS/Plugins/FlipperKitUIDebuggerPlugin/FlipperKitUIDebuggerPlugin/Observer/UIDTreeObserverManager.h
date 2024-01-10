/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import <FlipperKitUIDebuggerPlugin/UIDTraversalMode.h>
#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@class UIDContext;

@interface UIDTreeObserverManager : NSObject

+ (instancetype)shared;

@property(nonatomic, assign) UIDTraversalMode traversalMode;

- (void)startWithContext:(UIDContext*)context;
- (void)stop;

@end

NS_ASSUME_NONNULL_END

#endif
