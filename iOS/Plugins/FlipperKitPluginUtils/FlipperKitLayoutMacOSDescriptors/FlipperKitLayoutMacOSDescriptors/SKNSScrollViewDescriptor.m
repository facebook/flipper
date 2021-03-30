/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED

#import "SKNSScrollViewDescriptor.h"

@implementation SKNSScrollViewDescriptor

- (NSString*)identifierForNode:(NSScrollView*)node {
  SKNodeDescriptor* descriptor = [self descriptorForClass:[NSView class]];
  return [descriptor identifierForNode:node];
}

- (NSUInteger)childCountForNode:(NSScrollView*)node {
  SKNodeDescriptor* descriptor = [self descriptorForClass:[NSView class]];
  return [descriptor childCountForNode:node];
}

- (id)childForNode:(NSScrollView*)node atIndex:(NSUInteger)index {
  SKNodeDescriptor* descriptor = [self descriptorForClass:[NSView class]];
  return [descriptor childForNode:node atIndex:index];
}

- (id)dataForNode:(NSScrollView*)node {
  SKNodeDescriptor* descriptor = [self descriptorForClass:[NSView class]];
  return [descriptor dataForNode:node];
}

- (id)dataMutationsForNode:(NSScrollView*)node {
  SKNodeDescriptor* descriptor = [self descriptorForClass:[NSView class]];
  return [descriptor dataMutationsForNode:node];
}

- (NSArray<SKNamed<NSString*>*>*)attributesForNode:(NSScrollView*)node {
  SKNodeDescriptor* descriptor = [self descriptorForClass:[NSView class]];
  return [descriptor attributesForNode:node];
}

- (void)setHighlighted:(BOOL)highlighted forNode:(NSScrollView*)node {
  SKNodeDescriptor* descriptor = [self descriptorForClass:[NSView class]];
  [descriptor setHighlighted:highlighted forNode:node];
}

- (void)hitTest:(SKTouch*)touch forNode:(NSScrollView*)node {
  bool finish = true;
  for (NSInteger index = [self childCountForNode:node] - 1; index >= 0;
       index--) {
    id<NSObject> childNode = [self childForNode:node atIndex:index];
    CGRect frame;

    if ([childNode isKindOfClass:[NSViewController class]]) {
      NSViewController* child = (NSViewController*)childNode;
      if (child.view.isHidden) {
        continue;
      }

      frame = child.view.frame;
    } else {
      NSView* child = (NSView*)childNode;
      if (child.isHidden) {
        continue;
      }

      frame = child.frame;
    }

    frame.origin.x -= node.documentVisibleRect.origin.x;
    frame.origin.y -= node.documentVisibleRect.origin.y;

    if ([touch containedIn:frame]) {
      [touch continueWithChildIndex:index withOffset:frame.origin];
      finish = false;
    }
  }

  if (finish) {
    [touch finish];
  }
}

@end

#endif
