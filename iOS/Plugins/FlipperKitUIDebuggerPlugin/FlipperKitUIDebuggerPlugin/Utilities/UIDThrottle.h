/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface UIDThrottle : NSObject

@property(nonatomic, readonly) int64_t rate;

- (instancetype)initWithRate:(int64_t)rate;
- (instancetype)initWithRate:(int64_t)rate
                       queue:(nonnull dispatch_queue_t)queue;

- (void)run:(dispatch_block_t)block;
- (void)cancel;

@end

NS_ASSUME_NONNULL_END

#endif
