/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <UIKit/UIKit.h>

@class SKComponentLayoutWrapper;

/**
 A SKSubDescriptor is an object which knows how to expose an Object of type T
 to the SKLayoutDescriptor. This class is for frameworks wanting to pass data
 along through the Layout Descriptor.
 */
@interface SKSubDescriptor : NSObject

/**
 This is the SubDescriptor name.
 */
- (NSString*)getName;

/**
 This is the data the SubDescriptor wants to pass up to the SKLayoutDescriptor.
 */
- (NSString*)getDataForNode:(SKComponentLayoutWrapper*)node;

@end
