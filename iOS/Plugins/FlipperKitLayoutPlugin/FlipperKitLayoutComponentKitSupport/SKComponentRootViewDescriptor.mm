/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED

#import "SKComponentRootViewDescriptor.h"

#import <ComponentKit/CKComponentAttachController.h>
#import <ComponentKit/CKComponentAttachControllerInternal.h>
#import <ComponentKit/CKComponentHostingView.h>
#import <ComponentKit/CKComponentHostingViewInternal.h>
#import <ComponentKit/CKComponentLayout.h>
#import <ComponentKit/CKComponentRootViewInternal.h>

#import <FlipperKitLayoutHelpers/SKObject.h>
#import <FlipperKitLayoutPlugin/SKDescriptorMapper.h>

#import "SKComponentLayoutWrapper.h"

@implementation SKComponentRootViewDescriptor

- (NSString*)identifierForNode:(CKComponentRootView*)node {
  return [NSString stringWithFormat:@"%p", node];
}

- (NSUInteger)childCountForNode:(CKComponentRootView*)node {
  const auto state = CKGetAttachStateForView(node);
  return state == nil ? 0 : 1;
}

- (id)childForNode:(CKComponentRootView*)node atIndex:(NSUInteger)index {
  return [SKComponentLayoutWrapper
      newFromRoot:node
        parentKey:[NSString stringWithFormat:@"%@.", node.uniqueIdentifier]];
}

- (NSArray<SKNamed<NSDictionary*>*>*)dataForNode:(CKComponentRootView*)node {
  auto const attachState = CKGetAttachStateForView(node);
  return @[ [SKNamed
      newWithName:@"Identity"
        withValue:@{
          @"scopeRootIdentifier" : SKObject{@(attachState.scopeIdentifier)}
        }] ];
}

- (void)setHighlighted:(BOOL)highlighted forNode:(CKComponentRootView*)node {
  SKNodeDescriptor* viewDescriptor = [self descriptorForClass:[UIView class]];
  [viewDescriptor setHighlighted:highlighted forNode:node];
}

- (void)hitTest:(SKTouch*)touch forNode:(CKComponentRootView*)node {
  [touch continueWithChildIndex:0 withOffset:(CGPoint){0, 0}];
}

@end

#endif
