/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED

#import "SKComponentMountedView.h"

@implementation SKComponentMountedView

- (instancetype)initWithView:(UIView*)view
                    children:(std::vector<SKComponentLayoutWrapper*>)children {
  if (self = [super init]) {
    _view = view;
    _children = std::move(children);
  }
  return self;
}

@end

#endif
