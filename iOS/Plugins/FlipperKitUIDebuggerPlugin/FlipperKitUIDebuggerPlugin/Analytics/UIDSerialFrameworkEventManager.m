/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "UIDSerialFrameworkEventManager.h"

@interface UIDSerialFrameworkEventManager () {
  dispatch_queue_t _queue;
  NSMutableArray<UIDFrameworkEventMetadata*>* _eventMetadata;
  NSMutableArray<UIDFrameworkEvent*>* _events;
  BOOL _enabled;
}

@end

@implementation UIDSerialFrameworkEventManager

- (instancetype)init {
  if (self = [super init]) {
    _enabled = false;
    _eventMetadata = [NSMutableArray new];
    _events = [NSMutableArray new];
    _queue = dispatch_queue_create(
        "ui-debugger.framework-events", DISPATCH_QUEUE_SERIAL);
  }
  return self;
}

- (void)emitEvent:(nonnull UIDFrameworkEvent*)event {
  dispatch_async(_queue, ^{
    if (self->_enabled) {
      [self->_events addObject:event];
    }
  });
}

- (void)registerEventMetadata:
    (nonnull UIDFrameworkEventMetadata*)eventMetadata {
  [_eventMetadata addObject:eventMetadata];
}

- (NSArray<UIDFrameworkEventMetadata*>*)eventsMetadata {
  return [_eventMetadata copy];
}

- (NSArray<UIDFrameworkEvent*>*)events {
  __block NSArray* events = nil;
  dispatch_sync(_queue, ^{
    events = [_events copy];
    [_events removeAllObjects];
  });
  return events ?: @[];
}

- (void)enable {
  dispatch_async(_queue, ^{
    self->_enabled = true;
  });
}

- (void)disable {
  dispatch_async(_queue, ^{
    self->_enabled = false;
    [self->_events removeAllObjects];
  });
}

@end

#endif
