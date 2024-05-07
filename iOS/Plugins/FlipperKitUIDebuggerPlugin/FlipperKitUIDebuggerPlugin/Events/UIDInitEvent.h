/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import <Foundation/Foundation.h>
#import "UIDTraversalMode.h"

NS_ASSUME_NONNULL_BEGIN

@class UIDFrameworkEventMetadata;

@interface UIDInitEvent : NSObject

@property(nonatomic) NSString* rootId;
@property(nonatomic) UIDTraversalMode currentTraversalMode;
@property(nonatomic, strong)
    NSArray<UIDFrameworkEventMetadata*>* frameworkEventMetadata;

+ (NSString*)name;

@end

NS_ASSUME_NONNULL_END

#endif
