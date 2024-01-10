/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN
#ifdef __cplusplus
extern "C" {
#endif
UIImage* UIDViewSnapshot(UIView* view);
UIImage* UIDApplicationSnapshot(UIApplication* application, NSArray* windows);
#ifdef __cplusplus
}
#endif
NS_ASSUME_NONNULL_END

#endif
