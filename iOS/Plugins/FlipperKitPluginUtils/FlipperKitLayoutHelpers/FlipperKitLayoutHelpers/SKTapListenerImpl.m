/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include <TargetConditionals.h>
#if FB_SONARKIT_ENABLED

#import "SKTapListenerImpl.h"

#import "SKHiddenWindow.h"

#import <FlipperKitHighlightOverlay/SKHighlightOverlay.h>

@implementation SKTapListenerImpl {
  NSMutableArray<SKTapReceiver>* _receiversWaitingForInput;

#if TARGET_OS_IPHONE
  UITapGestureRecognizer* _gestureRecognizer;
  SKHiddenWindow* _overlayWindow;
#elif TARGET_OS_OSX
  NSClickGestureRecognizer* _gestureRecognizer;
  SKHiddenWindow* _overlayView;
#endif
}

@synthesize isMounted = _isMounted;

- (instancetype)init {
  if (self = [super init]) {
    _receiversWaitingForInput = [NSMutableArray new];

#if TARGET_OS_IPHONE
    _gestureRecognizer = [[UITapGestureRecognizer alloc] initWithTarget:self
                                                                 action:nil];
    _gestureRecognizer.delegate = self;

    _isMounted = NO;

    _overlayWindow = [SKHiddenWindow new];
    _overlayWindow.hidden = YES;
    _overlayWindow.windowLevel = UIWindowLevelAlert;
    _overlayWindow.backgroundColor = [SKHighlightOverlay overlayColor];

    [_overlayWindow addGestureRecognizer:_gestureRecognizer];

#elif TARGET_OS_OSX
    _gestureRecognizer = [[NSClickGestureRecognizer alloc] initWithTarget:self
                                                                   action:nil];
    _gestureRecognizer.delegate = self;

    _isMounted = NO;

    _overlayView = [SKHiddenWindow new];

    _overlayView.hidden = YES;
    _overlayView.window.level = NSStatusWindowLevel;
    _overlayView.window.backgroundColor = [SKHighlightOverlay overlayColor];
    [_overlayView addGestureRecognizer:_gestureRecognizer];
#endif
  }

  return self;
}

- (void)mountWithFrame:(CGRect)frame {
  if (_isMounted) {
    return;
  }

#if TARGET_OS_IPHONE
  [_overlayWindow setFrame:frame];
  [_overlayWindow makeKeyAndVisible];
  _overlayWindow.hidden = NO;
  [[UIApplication sharedApplication].delegate.window addSubview:_overlayWindow];

#elif TARGET_OS_OSX
  _overlayView.hidden = NO;
  [[NSApplication sharedApplication].mainWindow.contentView
      addSubview:_overlayView];
  _overlayView.frame = frame;
  _overlayView.needsDisplay = YES;
#endif

  _isMounted = YES;
}

- (void)unmount {
  if (!_isMounted) {
    return;
  }

  [_receiversWaitingForInput removeAllObjects];

#if TARGET_OS_IPHONE
  [_overlayWindow removeFromSuperview];
  _overlayWindow.hidden = YES;
#elif TARGET_OS_OSX
  [_overlayView removeFromSuperview];
  _overlayView.hidden = YES;
#endif

  _isMounted = NO;
}

- (void)listenForTapWithBlock:(SKTapReceiver)receiver {
  [_receiversWaitingForInput addObject:receiver];
}

#if TARGET_OS_IPHONE
- (BOOL)gestureRecognizer:(UIGestureRecognizer*)gestureRecognizer
       shouldReceiveTouch:(UITouch*)touch {
  if ([_receiversWaitingForInput count] == 0) {
    return YES;
  }

  CGPoint touchPoint = [touch locationInView:_overlayWindow];

  for (SKTapReceiver recv in _receiversWaitingForInput) {
    recv(touchPoint);
  }

  [_receiversWaitingForInput removeAllObjects];

  return NO;
}

#elif TARGET_OS_OSX
- (BOOL)gestureRecognizer:(NSGestureRecognizer*)gestureRecognizer
       shouldReceiveTouch:(NSTouch*)touch {
  if ([_receiversWaitingForInput count] == 0) {
    return YES;
  }
  if (@available(macOS 10.12.2, *)) {
    CGPoint touchPoint = [touch locationInView:_overlayView];
    for (SKTapReceiver recv in _receiversWaitingForInput) {
      recv(touchPoint);
    }
  }

  [_receiversWaitingForInput removeAllObjects];

  return NO;
}
#endif

@end

#endif
