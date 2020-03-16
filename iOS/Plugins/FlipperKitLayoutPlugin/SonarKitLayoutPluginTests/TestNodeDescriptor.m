/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "TestNodeDescriptor.h"

@implementation TestNodeDescriptor

- (NSString*)identifierForNode:(TestNode*)node {
  return node.nodeName;
}

- (NSUInteger)childCountForNode:(TestNode*)node {
  return [node.children count];
}

- (id)childForNode:(TestNode*)node atIndex:(NSUInteger)index {
  return [node.children objectAtIndex:index];
}

- (void)setHighlighted:(BOOL)highlighted forNode:(TestNode*)node {
  node.highlighted = highlighted;
}

- (void)hitTest:(SKTouch*)touch forNode:(TestNode*)node {
  NSUInteger index = [node.children count] - 1;
  for (TestNode* childNode in [node.children reverseObjectEnumerator]) {
    if ([touch containedIn:childNode.frame]) {
      [touch continueWithChildIndex:index withOffset:node.frame.origin];
      return;
    }

    index = index - 1;
  }

  [touch finish];
}

- (NSDictionary<NSString*, SKNodeUpdateData>*)dataMutationsForNode:
    (TestNode*)node {
  return @{@"TestNode.name" : ^(NSString* newName){
      node.nodeName = newName;
}
}
;
}

@end
