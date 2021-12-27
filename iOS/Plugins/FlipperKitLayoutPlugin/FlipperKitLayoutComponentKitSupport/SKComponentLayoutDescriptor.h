/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <FlipperKitLayoutHelpers/SKNodeDescriptor.h>

#import "SKSubDescriptor.h"

@class SKComponentLayoutWrapper;

typedef SKNamed* (*SKAttributeGenerator)(SKComponentLayoutWrapper* node);

@interface SKComponentLayoutDescriptor
    : SKNodeDescriptor<SKComponentLayoutWrapper*>

+ (void)registerSubDescriptor:(SKSubDescriptor)descriptor
                      forName:(NSString*)name;

/**
 Allows you to 'plug-in' additional logic to update the attribute
 string displayed for a node.

 You can return a `nil` object from this, it will be gracefully ignored.
 */
+ (void)registerAttributeGenerator:(SKAttributeGenerator)generator;

@end
