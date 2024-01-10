/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

@interface UIDBounds : NSObject

@property(nonatomic) NSInteger x;
@property(nonatomic) NSInteger y;
@property(nonatomic) NSInteger width;
@property(nonatomic) NSInteger height;

- (instancetype)initWithX:(NSInteger)x
                        y:(NSInteger)y
                    width:(NSInteger)width
                   height:(NSInteger)height;

+ (instancetype)fromRect:(CGRect)rect;

@end

NS_ASSUME_NONNULL_END

#endif
