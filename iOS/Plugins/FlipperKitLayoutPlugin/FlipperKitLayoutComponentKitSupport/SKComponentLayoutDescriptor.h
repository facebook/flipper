/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <FlipperKitLayoutPlugin/SKNodeDescriptor.h>

#import "SKSubDescriptor.h"

@class SKComponentLayoutWrapper;

@interface SKComponentLayoutDescriptor
    : SKNodeDescriptor<SKComponentLayoutWrapper*>

- (void)addSubDescriptors:(NSArray<SKSubDescriptor*>*)subDescriptors;

@end
