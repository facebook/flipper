/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the LICENSE
 * file in the root directory of this source tree.
 */
//
//  FKUserDefaultsSwizzleUtility.h
//  FlipperKit
//
//  Created by Marc Terns on 10/6/18.
//  Copyright (c) 2018-present, Facebook, Inc.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface FKUserDefaultsSwizzleUtility : NSObject

+ (void)swizzleSelector:(SEL)selector class:(Class)aClass block:(void(^)(NSInvocation *invocation))block;

@end

NS_ASSUME_NONNULL_END
