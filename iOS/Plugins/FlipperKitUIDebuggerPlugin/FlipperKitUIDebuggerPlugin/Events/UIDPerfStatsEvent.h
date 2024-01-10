/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface UIDPerfStatsEvent : NSObject

@property(nonatomic) double txId;
@property(nonatomic, strong) NSString* observerType;
@property(nonatomic) NSUInteger nodesCount;

@property(nonatomic) long start;
@property(nonatomic) long traversalMS;
@property(nonatomic) long snapshotMS;
@property(nonatomic) long queuingMS;
@property(nonatomic) long deferredComputationMS;
@property(nonatomic) long serializationMS;
@property(nonatomic) long socketMS;
@property(nonatomic) long frameworkEventsMS;
@property(nonatomic) long payloadSize;
@property(nonatomic) NSUInteger eventsCount;
@property(nonatomic) NSDictionary<NSString*, NSNumber*>* dynamicMeasures;

+ (NSString*)name;

@end

NS_ASSUME_NONNULL_END

#endif
