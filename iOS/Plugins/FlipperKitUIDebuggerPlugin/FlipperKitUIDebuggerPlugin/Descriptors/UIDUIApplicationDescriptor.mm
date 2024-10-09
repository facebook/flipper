/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "UIDUIApplicationDescriptor.h"
#import <objc/runtime.h>
#import <string>
#import <unordered_set>
#import "UIDBounds.h"
#import "UIDSnapshot.h"

@implementation UIDUIApplicationDescriptor

- (NSArray<id<NSObject>>*)childrenOfNode:(UIApplication*)node {
  static std::unordered_set<std::string> ignoredWindows(
      {"FBStatusBarTrackingWindow",
       "FBAccessibilityOverlayWindow",
       "UITextEffectsWindow"});

  NSMutableArray<UIWindow*>* windows = [NSMutableArray new];
  if (@available(iOS 13, *)) {
    for (UIWindowScene* scene in node.connectedScenes) {
      [windows addObjectsFromArray:scene.windows];
    }
  } else {
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
    // TODO T202813939 Remove this branch once we drop support for iOS lower
    // than 13
    [windows addObjectsFromArray:node.windows];
  }
#pragma clang diagnostic pop
  NSMutableArray<UIWindow*>* children = [NSMutableArray new];
  for (UIWindow* window in windows) {
    if (ignoredWindows.find(class_getName(window.class)) !=
        ignoredWindows.end()) {
      continue;
    }
    [children addObject:window];
  }
  return children;
}

- (id<NSObject>)activeChildForNode:(UIApplication*)node {
/* @cwt-override FIXME[T168581563]: -Wnullable-to-nonnull-conversion */
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wnullable-to-nonnull-conversion"
  return node.keyWindow;
#pragma clang diagnostic pop
}

- (UIDBounds*)boundsForNode:(UIApplication*)node {
  return [UIDBounds fromRect:[UIScreen mainScreen].bounds];
}

- (UIImage*)snapshotForNode:(UIApplication*)node {
  NSMutableArray<UIWindow*>* windows = [NSMutableArray new];
  UIWindow* window = node.keyWindow;
  if (window != nil) {
    [windows addObject:window];
  }
  return UIDApplicationSnapshot(node, windows);
}

@end

#endif
