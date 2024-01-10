/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import <FlipperKit/SKMacros.h>
#import <UIKit/UIKit.h>
#import "UIDUIViewObserverDelegate.h"

NS_ASSUME_NONNULL_BEGIN

@class UIDContext;

@interface UIDUIViewBasicObserver : NSObject

- (instancetype)initWithContext:(UIDContext*)context
                       delegate:(id<UIDUIViewObserverDelegate>)delegate;

@end

NS_ASSUME_NONNULL_END

#endif
