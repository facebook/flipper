/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED

#import "SKComponentMountedViewDescriptor.h"

#import <ComponentKit/CKComponent.h>
#import <ComponentKit/CKComponentInternal.h>

#import <FlipperKitHighlightOverlay/SKHighlightOverlay.h>
#import <FlipperKitLayoutHelpers/SKObject.h>
#import <FlipperKitLayoutTextSearchable/FKTextSearchable.h>

#import "CKComponent+Sonar.h"
#import "SKComponentLayoutWrapper.h"
#import "SKComponentMountedView.h"
#import "Utils.h"

@implementation SKComponentMountedViewDescriptor

- (SKNodeDescriptor*)_viewDescriptorFor:(SKComponentMountedView*)node {
  // For most methods, we delegate to the descriptor for the underlying view.
  return [self descriptorForClass:[node.view class]];
}

- (NSString*)identifierForNode:(SKComponentMountedView*)node {
  return [[self _viewDescriptorFor:node] identifierForNode:node.view];
}

- (NSString*)nameForNode:(SKComponentMountedView*)node {
  return [[self _viewDescriptorFor:node] nameForNode:node.view];
}

- (NSUInteger)childCountForNode:(SKComponentMountedView*)node {
  // An obvious future improvement: we should also return any
  // non-ComponentKit-managed child views of our view.
  // Explicit nil check; -children will return garbage if invoked on nil
  return node ? node.children.size() : 0;
}

- (id)childForNode:(SKComponentMountedView*)node atIndex:(NSUInteger)index {
  // Explicit nil check; -children will return garbage if invoked on nil
  return node ? node.children[index] : nil;
}

- (NSArray<SKNamed<NSDictionary<NSString*, NSObject*>*>*>*)dataForNode:
    (SKComponentMountedView*)node {
  return [[self _viewDescriptorFor:node] dataForNode:node.view];
}

- (NSDictionary<NSString*, SKNodeUpdateData>*)dataMutationsForNode:
    (SKComponentMountedView*)node {
  return [[self _viewDescriptorFor:node] dataMutationsForNode:node.view];
}

- (NSArray<SKNamed<NSString*>*>*)attributesForNode:
    (SKComponentMountedView*)node {
  return [[self _viewDescriptorFor:node] attributesForNode:node.view];
}

- (void)setHighlighted:(BOOL)highlighted forNode:(SKComponentMountedView*)node {
  [[self _viewDescriptorFor:node] setHighlighted:highlighted forNode:node.view];
}

- (void)hitTest:(SKTouch*)touch forNode:(SKComponentMountedView*)node {
  if (!node) {
    return; // -children will return garbage if invoked on nil
  }
  const auto& children = node.children;
  bool finish = true;
  for (auto it = children.rbegin(); it != children.rend(); ++it) {
    SKComponentLayoutWrapper* child = *it;
    CGRect frame = {.origin = child.position, .size = child.size};
    if ([touch containedIn:frame]) {
      NSUInteger index = std::distance(children.begin(), it.base()) - 1;
      [touch continueWithChildIndex:index withOffset:child.position];
      finish = false;
    }
  }
  if (finish) {
    [touch finish];
  }
}

- (BOOL)matchesQuery:(NSString*)query forNode:(SKComponentMountedView*)node {
  return [[self _viewDescriptorFor:node] matchesQuery:query forNode:node.view];
}

@end

#endif
