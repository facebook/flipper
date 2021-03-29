/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED

#import "SKNSWindowDescriptor.h"

#import <FlipperKitLayoutHelpers/SKHiddenWindow.h>
#import <objc/runtime.h>

@implementation SKNSWindowDescriptor

- (NSString*)identifierForNode:(NSWindow*)node {
  return [NSString stringWithFormat:@"%p", node];
}

- (NSUInteger)childCountForNode:(NSWindow*)node {
  return [[self visibleChildrenForNode:node] count];
}

- (id)childForNode:(NSWindow*)node atIndex:(NSUInteger)index {
  return [self visibleChildrenForNode:node][index];
}

- (void)setHighlighted:(BOOL)highlighted forNode:(NSWindow*)node {
  SKNodeDescriptor* viewDescriptor = [self descriptorForClass:[NSView class]];
  [viewDescriptor setHighlighted:highlighted forNode:node.contentView];
}

- (void)hitTest:(SKTouch*)touch forNode:(NSWindow*)node {
  bool finish = true;
  for (NSInteger index = [self childCountForNode:node] - 1; index >= 0;
       index--) {
    NSView* child = [self childForNode:node atIndex:index];

    if ([touch containedIn:child.frame]) {
      [touch continueWithChildIndex:index withOffset:child.frame.origin];
      finish = false;
    }
  }
  if (finish) {
    [touch finish];
  }
}

- (NSArray<NSView*>*)visibleChildrenForNode:(NSWindow*)node {
  NSMutableArray<NSView*>* children = [NSMutableArray new];
  [children addObject:node.contentView];
  return children;
}

@end

#endif
