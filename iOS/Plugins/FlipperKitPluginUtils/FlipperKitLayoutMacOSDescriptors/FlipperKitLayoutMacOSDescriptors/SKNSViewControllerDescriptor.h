/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED

#import <AppKit/AppKit.h>

#import <FlipperKitLayoutHelpers/SKNodeDescriptor.h>

@class SKDescriptorMapper;

@interface SKNSViewControllerDescriptor : SKNodeDescriptor<NSViewController*>

@end

#endif
