/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED

#import <UIKit/UIKit.h>

@protocol UIDUIViewObserverDelegate<NSObject>
- (void)viewUpdateWith:(nonnull UIView*)view;
@end

#endif
