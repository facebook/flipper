/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <TargetConditionals.h>

#if TARGET_OS_IPHONE
#import <UIKit/UIKit.h>
#elif TARGET_OS_OSX
#import <AppKit/AppKit.h>
#import <Foundation/Foundation.h>
#import <QuartzCore/QuartzCore.h>
#endif

@interface SKHighlightOverlay : NSObject

+ (instancetype)sharedInstance;

#if TARGET_OS_IPHONE

+ (UIColor*)overlayColor;
- (void)mountInView:(UIView*)view withFrame:(CGRect)frame;

#elif TARGET_OS_OSX

+ (NSColor*)overlayColor;
- (void)mountInView:(NSView*)view withFrame:(CGRect)frame;

#endif

- (void)unmount;

@end
