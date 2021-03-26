/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <FlipperKitLayoutHelpers/FlipperKitLayoutDescriptorMapperProtocol.h>
#import <FlipperKitLayoutHelpers/SKNodeDescriptor.h>
#import <Foundation/Foundation.h>

@interface SKDescriptorMapper : NSObject<SKDescriptorMapperProtocol>

- (instancetype)initWithDefaults;

- (SKNodeDescriptor*)descriptorForClass:(Class)cls;

- (void)registerDescriptor:(SKNodeDescriptor*)descriptor forClass:(Class)cls;

- (NSArray<SKNodeDescriptor*>*)allDescriptors;

@end
