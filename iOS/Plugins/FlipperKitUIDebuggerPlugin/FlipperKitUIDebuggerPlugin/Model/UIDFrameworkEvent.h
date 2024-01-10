/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

typedef NSDictionary<NSString*, id>* UIDEventPayload;
typedef NSArray<NSString*>* UIDStacktrace;

@interface UIDFrameworkEvent : NSObject

@property(nonatomic) NSUInteger nodeIdentifier;
@property(nonatomic, strong) NSString* type;
@property(nonatomic, strong) NSDate* timestamp;
@property(nonatomic, strong) UIDEventPayload payload;
@property(nonatomic, strong) UIDStacktrace stacktrace;

@end

NS_ASSUME_NONNULL_END

#endif
