/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import <UIKit/UIKit.h>
#import "UIDTreeObserverBuilder.h"

NS_ASSUME_NONNULL_BEGIN

@interface UIDUIApplicationObserver : UIDTreeObserver<UIApplication*>

@end

@interface UIDUIApplicationObserverBuilder : NSObject<UIDTreeObserverBuilder>

@end

NS_ASSUME_NONNULL_END

#endif
