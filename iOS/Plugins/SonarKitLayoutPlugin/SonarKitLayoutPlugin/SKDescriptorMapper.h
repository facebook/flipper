/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
#import <Foundation/Foundation.h>

@class SKNodeDescriptor;

@interface SKDescriptorMapper : NSObject

- (instancetype)initWithDefaults;

- (SKNodeDescriptor *)descriptorForClass:(Class)cls;

- (void)registerDescriptor:(SKNodeDescriptor *)descriptor forClass:(Class)cls;

- (NSArray<SKNodeDescriptor *> *)allDescriptors;

@end
