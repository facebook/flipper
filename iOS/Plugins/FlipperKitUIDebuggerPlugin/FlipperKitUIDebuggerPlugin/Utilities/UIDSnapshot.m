/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "UIDSnapshot.h"
#import "UIDUIKitObserver.h"

#ifdef __cplusplus
extern "C" {
#endif
UIImage* UIDViewSnapshot(UIView* view) {
  UIGraphicsImageRenderer* renderer =
      [[UIGraphicsImageRenderer alloc] initWithSize:view.bounds.size];
  return [renderer imageWithActions:^(UIGraphicsImageRendererContext* context) {
    [[UIDUIKitObserver sharedInstance] setDrawObservationEnabled:false];
    [view drawViewHierarchyInRect:view.bounds afterScreenUpdates:true];
    [[UIDUIKitObserver sharedInstance] setDrawObservationEnabled:true];
  }];
}

UIImage* UIDApplicationSnapshot(UIApplication* application, NSArray* windows) {
  CGSize size = [UIScreen mainScreen].bounds.size;

  // Use the application key window bounds if possible.
  // In the case where the application is not using the entire screen,
  // like in Split View on an iPad, the running application is
  // not using the entire screen thus the snapshot stretches to
  // fill the screen size which is incorrect.
  if (application.keyWindow) {
    size = application.keyWindow.bounds.size;
  }

  UIGraphicsImageRenderer* renderer =
      [[UIGraphicsImageRenderer alloc] initWithSize:size];

  [[UIDUIKitObserver sharedInstance] setDrawObservationEnabled:false];
  UIImage* snapshot = [renderer
      imageWithActions:^(UIGraphicsImageRendererContext* rendererContext) {
        for (UIWindow* window in windows) {
          if (window.isHidden)
            continue;
          [window
              drawViewHierarchyInRect:CGRectMake(0, 0, size.width, size.height)
                   afterScreenUpdates:true];
        }
      }];
  [[UIDUIKitObserver sharedInstance] setDrawObservationEnabled:true];
  return snapshot;
}
#ifdef __cplusplus
}
#endif

#endif
