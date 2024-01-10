/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import <Foundation/Foundation.h>
#import "UIDTreeObserver.h"

@class UIDContext;

/**
  UIDTreeObserverBuilder, as the name suggests, can create an observers for a
  node. Basically, observer builders are registered in the factory. Then, when
  an observer is needed for a node, builders are asked whether they can create
  an observer for it. If it can, then it will create an observer for it.
 */
@protocol UIDTreeObserverBuilder

- (BOOL)canBuildFor:(id)node;
- (UIDTreeObserver*)buildWithContext:(UIDContext*)context;

@end

#endif
