/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface UIDFrameworkEventMetadata : NSObject

@property(nonatomic, strong) NSString* type;
@property(nonatomic, strong) NSString* documentation;

+ (instancetype)newWithType:(NSString*)type
              documentation:(NSString*)documentation;

+ (instancetype)new NS_UNAVAILABLE;

- (instancetype)init NS_UNAVAILABLE;

@end

NS_ASSUME_NONNULL_END

#endif
