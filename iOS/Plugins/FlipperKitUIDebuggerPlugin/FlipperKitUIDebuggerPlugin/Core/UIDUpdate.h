/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

@protocol UIDUpdate
@end

@interface UIDFrameUpdate : NSObject<UIDUpdate>

@property(nonatomic) NSString* observerType;
@property(nonatomic) NSString* rootId;
@property(nonatomic) NSArray* nodes;
@property(nonatomic) NSTimeInterval timestamp;
@property(nonatomic) long traversalMS;
@property(nonatomic) long snapshotMS;
@property(nonatomic) UIImage* snapshot;

@end

NS_ASSUME_NONNULL_END

#endif
