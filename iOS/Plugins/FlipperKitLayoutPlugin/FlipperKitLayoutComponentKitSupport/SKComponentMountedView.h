/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <Foundation/Foundation.h>

#import <vector>

NS_ASSUME_NONNULL_BEGIN

@class SKComponentLayoutWrapper;

/**
 Represents a non-leaf view created by ComponentKit. Its corresponding
 descriptor CKComponentMountedViewDescriptor delegates to the view's descriptor
 for attributes and most other behaviors, but redirects back into ComponentKit's
 SKComponentLayoutWrapper when queried for children.

 In this way, non-leaf views created by ComponentKit appear in the Flipper
 layout hierarchy as the child of the component that created their view.
 */
@interface SKComponentMountedView : NSObject

- (instancetype)initWithView:(UIView*)view
                    children:(std::vector<SKComponentLayoutWrapper*>)children;

@property(nonatomic, readonly) UIView* view;
@property(nonatomic, readonly) std::vector<SKComponentLayoutWrapper*> children;

@end

NS_ASSUME_NONNULL_END
