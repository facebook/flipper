/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED

#import <Foundation/Foundation.h>
#import "UIDNodeDescriptor.h"

NS_ASSUME_NONNULL_BEGIN

@interface UIDDescriptorRegister : NSObject

+ (instancetype)defaultRegister;

- (void)registerDescriptor:(UIDNodeDescriptor*)descriptor forClass:(Class)clazz;
- (UIDNodeDescriptor*)descriptorForClass:(Class)clazz;

@end

NS_ASSUME_NONNULL_END

#endif
