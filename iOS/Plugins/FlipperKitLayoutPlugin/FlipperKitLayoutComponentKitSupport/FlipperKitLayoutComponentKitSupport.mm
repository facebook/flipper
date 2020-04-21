/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED

#import "FlipperKitLayoutComponentKitSupport.h"

#import <ComponentKit/CKComponentHostingView.h>
#import <ComponentKit/CKComponentRootView.h>

#import <FlipperKitLayoutPlugin/SKDescriptorMapper.h>

#import "SKComponentLayoutDescriptor.h"
#import "SKComponentLayoutWrapper.h"
#import "SKComponentMountedView.h"
#import "SKComponentMountedViewDescriptor.h"
#import "SKComponentRootViewDescriptor.h"

@implementation FlipperKitLayoutComponentKitSupport

+ (void)setUpWithDescriptorMapper:(SKDescriptorMapper*)mapper {
  // What we really want here is "forProtocol:@protocol(CKInspectableView)" but
  // no such luck.
  [mapper registerDescriptor:[[SKComponentRootViewDescriptor alloc]
                                 initWithDescriptorMapper:mapper]
                    forClass:[CKComponentRootView class]];
  [mapper registerDescriptor:[[SKComponentLayoutDescriptor alloc]
                                 initWithDescriptorMapper:mapper]
                    forClass:[SKComponentLayoutWrapper class]];
  [mapper registerDescriptor:[[SKComponentMountedViewDescriptor alloc]
                                 initWithDescriptorMapper:mapper]
                    forClass:[SKComponentMountedView class]];
}

@end

#endif
