/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED

#import <UIKit/UIKit.h>
#import "UIDChainedDescriptor.h"

NS_ASSUME_NONNULL_BEGIN

@interface UIDUIViewDescriptor : UIDChainedDescriptor<UIView*>

@end

NS_ASSUME_NONNULL_END

#endif
