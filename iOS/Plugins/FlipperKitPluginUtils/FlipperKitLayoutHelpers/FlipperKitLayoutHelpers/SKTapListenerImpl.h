/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "SKTapListener.h"

#if TARGET_OS_IPHONE

@interface SKTapListenerImpl
    : NSObject<SKTapListener, UIGestureRecognizerDelegate>

#elif TARGET_OS_OSX

@interface SKTapListenerImpl
    : NSObject<SKTapListener, NSGestureRecognizerDelegate>

#endif

@end
