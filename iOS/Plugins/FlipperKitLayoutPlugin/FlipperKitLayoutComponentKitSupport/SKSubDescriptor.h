/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <UIKit/UIKit.h>

@class SKComponentLayoutWrapper;

/**
 A SKSubDescriptor is a function which knows how to expose additional data
 to SKLayoutDescriptor. This class is for frameworks wanting to pass data
 along through the Layout Descriptor.

 The infra expects that the string returned is a JSON string.
 For example: @"{\'key\': 5}"
 */
typedef NSString* (*SKSubDescriptor)(SKComponentLayoutWrapper* node);
