/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED

#import <UIKit/UIKit.h>
#import "UIDFrameworkEvent.h"
#import "UIDNode.h"

NS_ASSUME_NONNULL_BEGIN

@interface UIDSubtreeUpdateEvent : NSObject

@property(nonatomic) double txId;
@property(nonatomic, strong) NSString* observerType;
@property(nonatomic) NSUInteger rootId;
@property(nonatomic, strong) NSArray<UIDNode*>* nodes;
@property(nonatomic, strong) UIImage* snapshot;
@property(nonatomic, strong) NSArray<UIDFrameworkEvent*>* frameworkEvents;

+ (NSString*)name;

@end

NS_ASSUME_NONNULL_END

#endif
