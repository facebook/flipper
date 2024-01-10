/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@class UIDMetadata;

@interface UIDMetadataUpdateEvent : NSObject

@property(nonatomic, strong)
    NSDictionary<NSNumber*, UIDMetadata*>* attributeMetadata;

+ (NSString*)name;

@end

NS_ASSUME_NONNULL_END

#endif
