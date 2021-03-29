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
#endif

#if TARGET_OS_IPHONE

@interface SKHiddenWindow : UIWindow
@end

#elif TARGET_OS_OSX

@interface SKHiddenWindow : NSView
@end

#endif
