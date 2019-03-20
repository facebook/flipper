/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
#if FB_SONARKIT_ENABLED

#import "SKComponentRootViewDescriptor.h"

// TODO T41966103 Remove conditional imports
#if FLIPPER_OSS
#import <ComponentKit/CKComponentDataSourceAttachController.h>
#import <ComponentKit/CKComponentDataSourceAttachControllerInternal.h>
#else
#import <ComponentKit/CKComponentAttachController.h>
#import <ComponentKit/CKComponentAttachControllerInternal.h>
#endif
#import <ComponentKit/CKComponentHostingView.h>
#import <ComponentKit/CKComponentHostingViewInternal.h>
#import <ComponentKit/CKComponentLayout.h>
#import <ComponentKit/CKComponentRootViewInternal.h>

#import <FlipperKitLayoutPlugin/SKDescriptorMapper.h>

#import "SKComponentLayoutWrapper.h"

@implementation SKComponentRootViewDescriptor

- (NSString *)identifierForNode:(CKComponentRootView *)node {
  return [NSString stringWithFormat: @"%p", node];
}

- (NSUInteger)childCountForNode:(CKComponentRootView *)node {
  if ([node respondsToSelector:@selector(ck_attachState)]) {
    const auto state = [node ck_attachState];
    return state == nil ? 0 : 1;
  }
  return 0;
}

- (id)childForNode:(CKComponentRootView *)node atIndex:(NSUInteger)index {
  return [SKComponentLayoutWrapper newFromRoot:node];
}

- (void)setHighlighted:(BOOL)highlighted forNode:(CKComponentRootView *)node {
  SKNodeDescriptor *viewDescriptor = [self descriptorForClass: [UIView class]];
  [viewDescriptor setHighlighted: highlighted forNode: node];
}

- (void)hitTest:(SKTouch *)touch forNode:(CKComponentRootView *)node {
  [touch continueWithChildIndex: 0 withOffset: (CGPoint){ 0, 0 }];
}

@end

#endif
