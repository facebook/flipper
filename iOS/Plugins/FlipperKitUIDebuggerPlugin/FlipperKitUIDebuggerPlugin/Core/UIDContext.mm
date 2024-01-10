/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "UIDContext.h"
#import "UIDDescriptorRegister.h"
#import "UIDSerialFrameworkEventManager.h"
#import "UIDTreeObserverFactory.h"

@interface UIDContext () {
  NSMutableSet<id<UIDConnectionListener>>* _connectionListeners;
  dispatch_queue_t _accessQueue;
}

@end

@implementation UIDContext

- (instancetype)initWithApplication:(UIApplication*)application
                 descriptorRegister:(UIDDescriptorRegister*)descriptorRegister
                    observerFactory:(UIDTreeObserverFactory*)observerFactory {
  self = [super init];
  if (self) {
    _application = application;
    _descriptorRegister = descriptorRegister;
    _observerFactory = observerFactory;
    _connection = nil;
    _frameworkEventManager = [UIDSerialFrameworkEventManager new];
    _connectionListeners = [NSMutableSet new];
    _accessQueue =
        dispatch_queue_create("ui-debugger.context", DISPATCH_QUEUE_SERIAL);
  }
  return self;
}

- (NSSet<id<UIDConnectionListener>>*)connectionListeners {
  __block NSSet* listeners = nil;
  dispatch_sync(_accessQueue, ^{
    listeners = [_connectionListeners copy];
  });

  return listeners;
}

- (void)addConnectionListener:(id<UIDConnectionListener>)listener {
  dispatch_sync(_accessQueue, ^{
    [_connectionListeners addObject:listener];
  });
}

- (void)removeConnectionListener:(id<UIDConnectionListener>)listener {
  dispatch_sync(_accessQueue, ^{
    [_connectionListeners removeObject:listener];
  });
}

@end

#endif
