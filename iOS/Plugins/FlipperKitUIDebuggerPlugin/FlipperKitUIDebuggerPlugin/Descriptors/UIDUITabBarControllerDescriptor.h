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
  UITabBarController
  (https://developer.apple.com/documentation/uikit/uitabbarcontroller?language=objc)
    Properties:
  - viewControllers: root view controllers displayed by the tab bar user
  interface.
  - selectedViewController: the view controller associated with the
  currently selected tab bar item.
*/
@interface UIDUITabBarControllerDescriptor
    : UIDNodeDescriptor<UITabBarController*>

@end

NS_ASSUME_NONNULL_END

#endif
