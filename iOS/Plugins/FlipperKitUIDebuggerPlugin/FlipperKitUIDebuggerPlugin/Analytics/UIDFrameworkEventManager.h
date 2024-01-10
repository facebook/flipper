/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@class UIDFrameworkEventMetadata;
@class UIDFrameworkEvent;

@protocol UIDFrameworkEventManager<NSObject>

- (void)registerEventMetadata:(UIDFrameworkEventMetadata*)eventMetadata;
- (void)emitEvent:(UIDFrameworkEvent*)event;
- (NSArray<UIDFrameworkEventMetadata*>*)eventsMetadata;
- (NSArray<UIDFrameworkEvent*>*)events;
- (void)enable;
- (void)disable;

@end

NS_ASSUME_NONNULL_END

#endif
