/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "UIDUIApplicationObserver.h"
#import "UIDContext.h"
#import "UIDMainThread.h"
#import "UIDUIViewBasicObserver.h"

#define UID_THROTTLE_SECONDS 1

@interface UIDUIApplicationObserver ()<UIDUIViewObserverDelegate> {
  UIDContext* _context;
  UIDUIViewBasicObserver* _viewObserver;

  CFRunLoopObserverRef _observer;
  NSTimeInterval _lastInvocationTimestamp;
  bool _dirty;
}

@end

@implementation UIDUIApplicationObserver

- (instancetype)initWithContext:(UIDContext*)context {
  self = [super init];
  if (self) {
    _context = context;
    _lastInvocationTimestamp = 0;
    _dirty = true;
    _viewObserver = [[UIDUIViewBasicObserver alloc] initWithContext:_context
                                                           delegate:self];
    self.type = @"UIApplication";
  }
  return self;
}

- (void)subscribe:(UIApplication*)node {
  __weak typeof(self) weakSelf = self;
  _observer = CFRunLoopObserverCreateWithHandler(
      kCFAllocatorDefault,
      kCFRunLoopBeforeWaiting,
      true,
      INT_MAX,
      ^(CFRunLoopObserverRef observer, CFRunLoopActivity activity) {
        typeof(self) strongSelf = weakSelf;
        if (strongSelf) {
          NSTimeInterval currentTimestamp =
              [NSDate timeIntervalSinceReferenceDate];
          if (strongSelf->_lastInvocationTimestamp == 0 ||
              (currentTimestamp - strongSelf->_lastInvocationTimestamp >=
               UID_THROTTLE_SECONDS)) {
            if (strongSelf->_dirty) {
              strongSelf->_lastInvocationTimestamp = currentTimestamp;
              strongSelf->_dirty = false;
/* @cwt-override FIXME[T168581563]: -Wnullable-to-nonnull-conversion */
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wnullable-to-nonnull-conversion"
              [self processNode:strongSelf->_context.application
#pragma clang diagnostic pop
                   withSnapshot:true
                    withContext:strongSelf->_context];
            }
          }
        }
      });
  CFRunLoopAddObserver(CFRunLoopGetMain(), _observer, kCFRunLoopCommonModes);

  [[NSNotificationCenter defaultCenter]
      addObserver:self
         selector:@selector(orientationChanged:)
             name:UIDeviceOrientationDidChangeNotification
           object:nil];
}

- (void)unsubscribe {
  CFRunLoopRemoveObserver(CFRunLoopGetMain(), _observer, kCFRunLoopCommonModes);
  CFRelease(_observer);
  _observer = nil;

  [[NSNotificationCenter defaultCenter]
      removeObserver:self
                name:UIDeviceOrientationDidChangeNotification
              object:nil];

  _dirty = true;
}

- (void)orientationChanged:(NSNotification*)notification {
  /**
    Do not mark as dirty immediately as the view draws before
    is animated into position. Dispatch after the same throttle amount
    achieves the desired effect.
   */
  UIDRunBlockOnMainThreadAfter(
      ^{
        self->_dirty = true;
      },
      UID_THROTTLE_SECONDS);
}

- (void)viewUpdateWith:(UIView*)node {
  self->_dirty = true;
}

@end

@implementation UIDUIApplicationObserverBuilder

- (BOOL)canBuildFor:(id)node {
  return [node isKindOfClass:[UIApplication class]];
}

- (UIDTreeObserver*)buildWithContext:(UIDContext*)context {
  return [[UIDUIApplicationObserver alloc] initWithContext:context];
}

@end

#endif
