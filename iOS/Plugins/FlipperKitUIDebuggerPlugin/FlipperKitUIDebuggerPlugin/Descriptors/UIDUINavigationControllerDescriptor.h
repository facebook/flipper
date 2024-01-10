/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import <UIKit/UIKit.h>
#import "UIDNodeDescriptor.h"

NS_ASSUME_NONNULL_BEGIN

/**
  UINavigationController
  (https://developer.apple.com/documentation/uikit/uinavigationcontroller?language=objc)
 Propeties:
 - viewControllers: the view controllers currently on the navigation stack.
 - topViewController: last controller pushed on top of the navigation
  stack.
 - visibleViewController: the view controller associated with the
  currently visible view in the navigation stack. View Controller can also be
  presented instead of pushed. If presented, then it hasn't changed the stack
  even though its view is visible.
 */
@interface UIDUINavigationControllerDescriptor
    : UIDNodeDescriptor<UINavigationController*>

@end

NS_ASSUME_NONNULL_END

#endif
