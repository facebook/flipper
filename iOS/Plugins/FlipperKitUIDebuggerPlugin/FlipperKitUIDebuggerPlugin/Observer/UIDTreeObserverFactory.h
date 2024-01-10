/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import <UIKit/UIKit.h>
#import "UIDTreeObserverBuilder.h"

NS_ASSUME_NONNULL_BEGIN

@class UIDContext;

/**
  Factory of TreeObserver. It allows registration of different builders which
  are the ones responsible of actually building observes for nodes.
 */
@interface UIDTreeObserverFactory : NSObject

+ (instancetype)shared;

- (void)registerBuilder:(id<UIDTreeObserverBuilder>)builder;
- (UIDTreeObserver*)createObserverForNode:(id)node
                              withContext:(UIDContext*)context;
- (BOOL)hasObserverForNode:(id)node;

@end

NS_ASSUME_NONNULL_END

#endif
