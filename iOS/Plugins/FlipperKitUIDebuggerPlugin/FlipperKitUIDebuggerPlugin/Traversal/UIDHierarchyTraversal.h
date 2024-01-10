/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import <Foundation/Foundation.h>
#import "UIDDescriptorRegister.h"

NS_ASSUME_NONNULL_BEGIN

@class UIDNode;

@interface UIDHierarchyTraversal : NSObject

@property(nonatomic, strong) UIDDescriptorRegister* descriptorRegister;

+ (instancetype)createWithDescriptorRegister:
    (UIDDescriptorRegister*)descriptorRegister;

- (NSArray<UIDNode*>*)traverse:(id)root;

@end

NS_ASSUME_NONNULL_END

#endif
