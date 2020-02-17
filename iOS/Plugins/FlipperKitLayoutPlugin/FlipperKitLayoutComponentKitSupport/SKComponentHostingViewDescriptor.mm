/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED

#import "SKComponentHostingViewDescriptor.h"
#import <ComponentKit/CKComponentAttachController.h>
#import <ComponentKit/CKComponentAttachControllerInternal.h>
#import <ComponentKit/CKComponentHostingView.h>
#import <ComponentKit/CKComponentHostingViewInternal.h>
#import <ComponentKit/CKComponentLayout.h>

#import <FlipperKitLayoutPlugin/SKDescriptorMapper.h>

#import "SKComponentLayoutWrapper.h"

@implementation SKComponentHostingViewDescriptor

- (NSString*)identifierForNode:(CKComponentHostingView*)node {
  return [NSString stringWithFormat:@"%p", node];
}

- (NSUInteger)childCountForNode:(CKComponentHostingView*)node {
  return node.mountedLayout.component ? 1 : 0;
}

- (id)childForNode:(CKComponentHostingView*)node atIndex:(NSUInteger)index {
  return [SKComponentLayoutWrapper newFromRoot:node];
}

- (void)setHighlighted:(BOOL)highlighted forNode:(CKComponentHostingView*)node {
  SKNodeDescriptor* viewDescriptor = [self descriptorForClass:[UIView class]];
  [viewDescriptor setHighlighted:highlighted forNode:node];
}

- (void)hitTest:(SKTouch*)touch forNode:(CKComponentHostingView*)node {
  [touch continueWithChildIndex:0 withOffset:(CGPoint){0, 0}];
}

@end

#endif
