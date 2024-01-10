/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "UIDTreeObserverManager.h"
#import "UIDContext.h"
#import "UIDDescriptorRegister.h"
#import "UIDInitEvent.h"
#import "UIDJSONSerializer.h"
#import "UIDMetadataRegister.h"
#import "UIDMetadataUpdateEvent.h"
#import "UIDPerfStatsEvent.h"
#import "UIDPerformance.h"
#import "UIDSubtreeUpdateEvent.h"
#import "UIDTimeUtilities.h"
#import "UIDTreeObserverFactory.h"

@interface UIDTreeObserverManager ()<UIDUpdateDigester> {
  dispatch_queue_t _queue;
  UIDTreeObserver* _rootObserver;

  UIDContext* _context;
}

@property(nonatomic, strong) UIDTreeObserver* viewObserver;

@end

@implementation UIDTreeObserverManager

- (instancetype)init {
  self = [super init];
  if (self) {
    _queue =
        dispatch_queue_create("ui-debugger.background", DISPATCH_QUEUE_SERIAL);
    _context = nil;
    _traversalMode = UIDTraversalModeViewHierarchy;
  }
  return self;
}

+ (instancetype)shared {
  static UIDTreeObserverManager* instance = nil;

  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    instance = [UIDTreeObserverManager new];
  });

  return instance;
}

- (void)setTraversalMode:(UIDTraversalMode)traversalMode {
  if (_traversalMode == traversalMode) {
    return;
  }

  _rootObserver.traversalMode = _traversalMode = traversalMode;

  // trigger another pass
  dispatch_async(dispatch_get_main_queue(), ^{
    [self->_rootObserver processNode:self->_context.application
                        withSnapshot:YES
                         withContext:self->_context];
  });
}

- (void)startWithContext:(UIDContext*)context {
  _context = context;
  _context.updateDigester = self;

  [self sendInit];

  if (!_rootObserver) {
    _rootObserver =
        [_context.observerFactory createObserverForNode:context.application
                                            withContext:_context];
  }

  [_rootObserver subscribe:_context.application];

  [_context.frameworkEventManager enable];

  __weak __typeof(self) weakSelf = self;
  [_context.connection
        receive:@"onTraversalModeChange"
      withBlock:^(NSDictionary* data, id<FlipperResponder> responder) {
        NSString* _Nullable maybeMode =
            [data[@"mode"] isKindOfClass:NSString.class] ? data[@"mode"] : nil;
        if (maybeMode == nil) {
          return;
        }
        weakSelf.traversalMode = UIDTraversalModeFromString(maybeMode);
      }];
}

- (void)stop {
  [_rootObserver unsubscribe];

  [[UIDMetadataRegister shared] reset];

  [_context.frameworkEventManager disable];
}

- (void)sendInit {
  UIDNodeDescriptor* descriptor =
      [_context.descriptorRegister descriptorForClass:[UIApplication class]];

  UIDInitEvent* init = [UIDInitEvent new];
  init.rootId = [descriptor identifierForNode:_context.application];
  init.frameworkEventMetadata = [_context.frameworkEventManager eventsMetadata];
  init.currentTraversalMode = _traversalMode;

  [_context.connection send:[UIDInitEvent name] withRawParams:UID_toJSON(init)];
}

- (void)sendMetadataUpdate {
  NSDictionary* pendingMetadata =
      [[UIDMetadataRegister shared] extractPendingMetadata];
  if (![pendingMetadata count]) {
    return;
  }

  UIDMetadataUpdateEvent* metadataUpdateEvent = [UIDMetadataUpdateEvent new];
  metadataUpdateEvent.attributeMetadata = pendingMetadata;

  id JSON = UID_toJSON(metadataUpdateEvent);

  [_context.connection send:[UIDMetadataUpdateEvent name] withRawParams:JSON];
}

- (void)digest:(nonnull id<UIDUpdate>)update {
  uint64_t t0 = UIDPerformanceNow();
  dispatch_async(_queue, ^{
    uint64_t t1 = UIDPerformanceNow();

    UIDPerformanceClear();

    UIDSubtreeUpdate* subtreeUpdate = (UIDSubtreeUpdate*)update;

    UIDSubtreeUpdateEvent* subtreeUpdateEvent = [UIDSubtreeUpdateEvent new];
    subtreeUpdateEvent.txId = UIDPerformanceTimeIntervalSince1970();
    subtreeUpdateEvent.observerType = subtreeUpdate.observerType;
    subtreeUpdateEvent.rootId = subtreeUpdate.rootId;
    subtreeUpdateEvent.nodes = subtreeUpdate.nodes;
    subtreeUpdateEvent.snapshot = subtreeUpdate.snapshot;
    subtreeUpdateEvent.frameworkEvents =
        [self->_context.frameworkEventManager events];

    uint64_t t2 = UIDPerformanceNow();

    id intermediate = UID_toFoundation(subtreeUpdateEvent);

    uint64_t t3 = UIDPerformanceNow();

    NSString* JSON = UID_FoundationtoJSON(intermediate);
    uint64_t t4 = UIDPerformanceNow();
    NSUInteger payloadSize = JSON.length;

    [self sendMetadataUpdate];

    [self->_context.connection send:[UIDSubtreeUpdateEvent name]
                      withRawParams:JSON];

    uint64_t t5 = UIDPerformanceNow();

    UIDPerfStatsEvent* perfStats = [UIDPerfStatsEvent new];
    perfStats.txId = subtreeUpdateEvent.txId;
    perfStats.observerType = subtreeUpdate.observerType;
    perfStats.nodesCount = subtreeUpdate.nodes.count;
    perfStats.eventsCount = subtreeUpdateEvent.frameworkEvents.count;
    perfStats.start = UIDTimeIntervalToMS(subtreeUpdate.timestamp);
    perfStats.traversalMS = subtreeUpdate.traversalMS;
    perfStats.snapshotMS = subtreeUpdate.snapshotMS;
    perfStats.queuingMS = UIDMonotonicTimeConvertMachUnitsToMS(t1 - t0);
    perfStats.frameworkEventsMS = UIDMonotonicTimeConvertMachUnitsToMS(t2 - t1);
    perfStats.deferredComputationMS =
        UIDMonotonicTimeConvertMachUnitsToMS(t3 - t2);
    perfStats.serializationMS = UIDMonotonicTimeConvertMachUnitsToMS(t4 - t3);
    perfStats.socketMS = UIDMonotonicTimeConvertMachUnitsToMS(t5 - t4);
    perfStats.payloadSize = payloadSize;
    perfStats.dynamicMeasures = UIDPerformanceGet();

    [self->_context.connection send:[UIDPerfStatsEvent name]
                      withRawParams:UID_toJSON(perfStats)];
  });
}

@end

#endif
