/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <Foundation/Foundation.h>

#import <FlipperKitLayoutPlugin/SKDescriptorMapper.h>
#import "SKSubDescriptor.h"

@interface FlipperKitLayoutComponentKitSupport : NSObject

+ (void)setUpWithDescriptorMapper:(SKDescriptorMapper*)mapper;

+ (void)setUpWithDescriptorMapper:(SKDescriptorMapper*)mapper
                   subDescriptors:(NSArray<SKSubDescriptor*>*)subDescriptors;

@end
