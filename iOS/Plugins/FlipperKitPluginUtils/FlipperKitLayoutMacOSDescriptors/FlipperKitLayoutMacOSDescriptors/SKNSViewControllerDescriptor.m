/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED

#import "SKNSViewControllerDescriptor.h"

@implementation SKNSViewControllerDescriptor

- (NSString*)identifierForNode:(NSViewController*)node {
  return [NSString stringWithFormat:@"%p", node];
}

- (NSUInteger)childCountForNode:(NSViewController*)node {
  return 1;
}

- (id)childForNode:(NSViewController*)node atIndex:(NSUInteger)index {
  return node.view;
}

- (void)setHighlightedForNode:(NSViewController*)node {
}

- (NSArray<SKNamed<NSString*>*>*)attributesForNode:(NSViewController*)node {
  return @[ [SKNamed newWithName:@"addr"
                       withValue:[NSString stringWithFormat:@"%p", node]] ];
}

- (void)setHighlighted:(BOOL)highlighted forNode:(NSViewController*)node {
  SKNodeDescriptor* descriptor = [self descriptorForClass:[NSView class]];
  [descriptor setHighlighted:highlighted forNode:node.view];
}

- (void)hitTest:(SKTouch*)touch forNode:(NSViewController*)node {
  [touch continueWithChildIndex:0 withOffset:(CGPoint){0, 0}];
}

@end

#endif
