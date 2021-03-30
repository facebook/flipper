/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED

#import "SKNSApplicationDescriptor.h"

#import <FlipperKitLayoutHelpers/SKHiddenWindow.h>
#import <objc/runtime.h>

@implementation SKNSApplicationDescriptor

- (NSString*)identifierForNode:(NSApplication*)node {
  return [NSString stringWithFormat:@"%p", node];
}

- (NSUInteger)childCountForNode:(NSApplication*)node {
  return [[self visibleChildrenForNode:node] count];
}

- (id)childForNode:(NSApplication*)node atIndex:(NSUInteger)index {
  return [self visibleChildrenForNode:node][index];
}

- (void)setHighlighted:(BOOL)highlighted forNode:(NSApplication*)node {
  SKNodeDescriptor* windowDescriptor =
      [self descriptorForClass:[NSWindow class]];
  [windowDescriptor setHighlighted:highlighted forNode:[node keyWindow]];
}

- (void)hitTest:(SKTouch*)touch forNode:(NSApplication*)node {
  bool finish = true;
  for (NSInteger index = [self childCountForNode:node] - 1; index >= 0;
       index--) {
    NSWindow* child = [self childForNode:node atIndex:index];

    if ([touch containedIn:child.frame]) {
      [touch continueWithChildIndex:index withOffset:child.frame.origin];
      finish = false;
    }
  }
  if (finish) {
    [touch finish];
  }
}

- (NSArray<NSWindow*>*)visibleChildrenForNode:(NSApplication*)node {
  NSMutableArray<NSWindow*>* children = [NSMutableArray new];
  for (NSWindow* window in node.windows) {
    [children addObject:window];
  }
  return children;
}

@end

#endif
