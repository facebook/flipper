/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED

#import "SKHighlightOverlay.h"

@implementation SKHighlightOverlay {
  CALayer* _overlayLayer;
}

+ (instancetype)sharedInstance {
  static SKHighlightOverlay* sharedInstance = nil;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    sharedInstance = [self new];
  });
  return sharedInstance;
}

- (instancetype)init {
  if (self = [super init]) {
    _overlayLayer = [CALayer layer];
    _overlayLayer.backgroundColor = [SKHighlightOverlay overlayColor].CGColor;
  }

  return self;
}

#if TARGET_OS_IPHONE

- (void)mountInView:(UIView*)view withFrame:(CGRect)frame {
  [CATransaction begin];
  [CATransaction setValue:(id)kCFBooleanTrue
                   forKey:kCATransactionDisableActions];
  _overlayLayer.frame = frame;
  [view.layer addSublayer:_overlayLayer];
  [CATransaction commit];
}

#elif TARGET_OS_OSX

- (void)mountInView:(NSView*)view withFrame:(CGRect)frame {
  [CATransaction begin];
  [CATransaction setValue:(id)kCFBooleanTrue
                   forKey:kCATransactionDisableActions];
  _overlayLayer.frame = frame;
  [view.layer addSublayer:_overlayLayer];
  [CATransaction commit];
}

#endif

- (void)unmount {
  [_overlayLayer removeFromSuperlayer];
}

#if TARGET_OS_IPHONE

+ (UIColor*)overlayColor {
  return [UIColor colorWithRed:136.0 / 255.0
                         green:117.0 / 255.0
                          blue:197.0 / 255.0
                         alpha:0.6];
}

#elif TARGET_OS_OSX

+ (NSColor*)overlayColor {
  return [NSColor colorWithRed:136.0 / 255.0
                         green:117.0 / 255.0
                          blue:197.0 / 255.0
                         alpha:0.6];
}

#endif

@end

#endif
