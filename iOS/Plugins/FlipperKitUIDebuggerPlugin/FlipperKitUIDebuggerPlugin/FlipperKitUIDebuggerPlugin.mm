/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "FlipperKitUIDebuggerPlugin.h"
#import <FlipperKit/FlipperClient.h>
#import <FlipperKit/FlipperConnection.h>
#import <FlipperKit/FlipperResponder.h>
#import <UIKit/UIKit.h>

#import "Core/UIDContext.h"

#import "Descriptors/UIDDescriptorRegister.h"
#import "Observer/UIDTreeObserverFactory.h"
#import "Observer/UIDTreeObserverManager.h"

#import "UIDTraversalMode.h"

@implementation FlipperKitUIDebuggerPlugin {
  UIDContext* _context;
}

- (instancetype)initWithContext:(UIDContext*)context {
  if (self = [super init]) {
    self->_context = context;
  }
  return self;
}

- (instancetype)init {
  UIDContext* context = [[UIDContext alloc]
      initWithApplication:[UIApplication sharedApplication]
       descriptorRegister:[UIDDescriptorRegister defaultRegister]
          observerFactory:[UIDTreeObserverFactory shared]];
  return [self initWithContext:context];
}

- (NSString*)identifier {
  return @"ui-debugger";
}

- (void)didConnect:(id<FlipperConnection>)connection {
  if (!_context.application) {
    _context.application = [UIApplication sharedApplication];
  }

  _context.connection = connection;
  [[UIDTreeObserverManager shared] startWithContext:_context];

  NSSet<id<UIDConnectionListener>>* connectionListeners =
      _context.connectionListeners;
  for (id<UIDConnectionListener> listener in connectionListeners) {
    [listener onDidConnect];
  }
}

- (void)didDisconnect {
  _context.connection = nil;
  [[UIDTreeObserverManager shared] stop];

  NSSet<id<UIDConnectionListener>>* connectionListeners =
      _context.connectionListeners;
  for (id<UIDConnectionListener> listener in connectionListeners) {
    [listener onDidDisconnect];
  }
}

@end

#endif
