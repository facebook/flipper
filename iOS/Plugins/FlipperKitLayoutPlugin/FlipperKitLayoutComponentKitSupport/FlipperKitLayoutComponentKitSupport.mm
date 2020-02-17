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

#import "SKComponentHostingViewDescriptor.h"
#import "SKComponentLayoutDescriptor.h"
#import "SKComponentLayoutWrapper.h"
#import "SKComponentRootViewDescriptor.h"
#import "SKSubDescriptor.h"

@implementation FlipperKitLayoutComponentKitSupport

+ (void)setUpWithDescriptorMapper:(SKDescriptorMapper*)mapper
                   subDescriptors:(NSArray<SKSubDescriptor*>*)subDescriptors {
  [mapper registerDescriptor:[[SKComponentHostingViewDescriptor alloc]
                                 initWithDescriptorMapper:mapper]
                    forClass:[CKComponentHostingView class]];
  [mapper registerDescriptor:[[SKComponentRootViewDescriptor alloc]
                                 initWithDescriptorMapper:mapper]
                    forClass:[CKComponentRootView class]];
  SKComponentLayoutDescriptor* layoutDescriptor =
      [[SKComponentLayoutDescriptor alloc] initWithDescriptorMapper:mapper];
  [layoutDescriptor addSubDescriptors:subDescriptors];
  [mapper registerDescriptor:layoutDescriptor
                    forClass:[SKComponentLayoutWrapper class]];
}

+ (void)setUpWithDescriptorMapper:(SKDescriptorMapper*)mapper {
  // What we really want here is "forProtocol:@protocol(CKInspectableView)" but
  // no such luck.
  [mapper registerDescriptor:[[SKComponentHostingViewDescriptor alloc]
                                 initWithDescriptorMapper:mapper]
                    forClass:[CKComponentHostingView class]];
  [mapper registerDescriptor:[[SKComponentRootViewDescriptor alloc]
                                 initWithDescriptorMapper:mapper]
                    forClass:[CKComponentRootView class]];
  [mapper registerDescriptor:[[SKComponentLayoutDescriptor alloc]
                                 initWithDescriptorMapper:mapper]
                    forClass:[SKComponentLayoutWrapper class]];
}

@end

#endif
