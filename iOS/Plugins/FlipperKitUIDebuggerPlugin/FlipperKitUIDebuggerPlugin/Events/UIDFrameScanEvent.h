/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import <UIKit/UIKit.h>
#import "UIDFrameworkEvent.h"
#import "UIDNode.h"

NS_ASSUME_NONNULL_BEGIN

@interface UIDSnapshotInfo : NSObject

@property(nonatomic) NSString* nodeId;
@property(nonatomic, strong) UIImage* image;

@end

@interface UIDFrameScanEvent : NSObject

@property(nonatomic) double timestamp;
@property(nonatomic, strong) NSArray<UIDNode*>* nodes;
@property(nonatomic, strong) UIDSnapshotInfo* snapshot;
@property(nonatomic, strong) NSArray<UIDFrameworkEvent*>* frameworkEvents;

+ (NSString*)name;

@end

NS_ASSUME_NONNULL_END

#endif
