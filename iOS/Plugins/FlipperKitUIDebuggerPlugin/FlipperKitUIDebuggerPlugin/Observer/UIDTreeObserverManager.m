/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "UIDTreeObserverManager.h"
#import <FlipperKit/FlipperResponder.h>
#import "UIDCompoundTypeHint.h"
#import "UIDContext.h"
#import "UIDDescriptorRegister.h"
#import "UIDFrameScanEvent.h"
#import "UIDInitEvent.h"
#import "UIDJSONSerializer.h"
#import "UIDMainThread.h"
#import "UIDMetadataRegister.h"
#import "UIDMetadataUpdateEvent.h"
#import "UIDPerfStatsEvent.h"
#import "UIDPerformance.h"
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
/* @cwt-override FIXME[T168581563]: -Wnullable-to-nonnull-conversion */
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wnullable-to-nonnull-conversion"
    [self->_rootObserver processNode:self->_context.application
#pragma clang diagnostic pop
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
/* @cwt-override FIXME[T168581563]: -Wnullable-to-nonnull-conversion */
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wnullable-to-nonnull-conversion"
        [_context.observerFactory createObserverForNode:context.application
#pragma clang diagnostic pop
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
/* @cwt-override FIXME[T168581563]: -Wnullable-to-nonnull-conversion */
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wnullable-to-nonnull-conversion"
        weakSelf.traversalMode = UIDTraversalModeFromString(maybeMode);
#pragma clang diagnostic pop
      }];

  [_context.connection
        receive:@"editAttribute"
      withBlock:^(NSDictionary* data, id<FlipperResponder> responder) {
        NSString* nodeId = [data[@"nodeId"] isKindOfClass:NSString.class]
            ? data[@"nodeId"]
            : nil;
        if (nodeId == nil) {
          [responder error:[NSError UID_errorPayloadWithType:
                                        AttributeEditorErrorTypeMissingNodeId]];
          return;
        }

        NSMutableArray<UIDMetadataId>* metadataIds =
            [data[@"metadataIdPath"] isKindOfClass:NSArray.class]
            ? data[@"metadataIdPath"]
            : nil;
        if (metadataIds == nil) {
          [responder
              error:[NSError UID_errorPayloadWithType:
                                 AttributeEditorErrorTypeMissingMetadataIds]];
          return;
        }

        id value = data[@"value"];

        UIDCompoundTypeHint hint = UIDCompoundTypeHintNone;
        NSString* _Nullable maybeHint = data[@"compoundTypeHint"];
        if (maybeHint && [maybeHint isKindOfClass:NSString.class]) {
          hint = UIDCompoundTypeHintFromString(maybeHint);
        }

        UIDTreeObserverManager* strongSelf = weakSelf;
        if (strongSelf == nil) {
          [responder error:[NSError UID_errorPayloadWithType:
                                        AttributeEditorErrorTypeUnknown]];
          return;
        }

        __weak id<FlipperResponder> weakReponder = responder;
        ReportAttributeEditorResult reportResult = ^(NSError* error) {
          id<FlipperResponder> strongReponder = weakReponder;
          if (!strongReponder) {
            return;
          }
          if (error == nil) {
            [responder success:@{}];
          } else {
            [responder error:[NSError UID_errorPayloadWithError:error]];
          }
        };
        id root = strongSelf->_context.application;
        [strongSelf->_context.attributeEditor editNodeWithId:nodeId
                                                       value:value
                                         metadataIdentifiers:metadataIds
                                            compoundTypeHint:hint
                                                        root:root
                                                reportResult:reportResult];
      }];

  UIDRunBlockOnMainThreadAsync(^{
    UIDTreeObserverManager* strongSelf = weakSelf;
    if (strongSelf == nil) {
      return;
    }
    UIApplication* application = strongSelf->_context.application;
    if (application) {
      [strongSelf->_rootObserver processNode:application
                                withSnapshot:YES
                                 withContext:strongSelf->_context];
    }
  });
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
/* @cwt-override FIXME[T168581563]: -Wnullable-to-nonnull-conversion */
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wnullable-to-nonnull-conversion"
  init.rootId = [descriptor identifierForNode:_context.application];
#pragma clang diagnostic pop
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

    UIDFrameUpdate* frameUpdate = (UIDFrameUpdate*)update;

    UIDFrameScanEvent* frameScanEvent = [UIDFrameScanEvent new];
    frameScanEvent.timestamp = UIDPerformanceTimeIntervalSince1970();
    frameScanEvent.nodes = frameUpdate.nodes;

    UIDSnapshotInfo* snapshot = [UIDSnapshotInfo new];
    snapshot.image = frameUpdate.snapshot;
    snapshot.nodeId = frameUpdate.rootId;

    frameScanEvent.snapshot = snapshot;
    frameScanEvent.frameworkEvents =
        [self->_context.frameworkEventManager events];

    uint64_t t2 = UIDPerformanceNow();

    id intermediate = UID_toFoundation(frameScanEvent);

    uint64_t t3 = UIDPerformanceNow();

    NSString* JSON = UID_FoundationtoJSON(intermediate);
    uint64_t t4 = UIDPerformanceNow();
    NSUInteger payloadSize = JSON.length;

    [self sendMetadataUpdate];

    [self->_context.connection send:[UIDFrameScanEvent name]
                      withRawParams:JSON];

    uint64_t t5 = UIDPerformanceNow();

    UIDPerfStatsEvent* perfStats = [UIDPerfStatsEvent new];
    perfStats.txId = frameScanEvent.timestamp;
    perfStats.observerType = frameUpdate.observerType;
    perfStats.nodesCount = frameUpdate.nodes.count;
    perfStats.eventsCount = frameScanEvent.frameworkEvents.count;
    perfStats.start = UIDTimeIntervalToMS(frameUpdate.timestamp);
    perfStats.traversalMS = frameUpdate.traversalMS;
    perfStats.snapshotMS = frameUpdate.snapshotMS;
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
