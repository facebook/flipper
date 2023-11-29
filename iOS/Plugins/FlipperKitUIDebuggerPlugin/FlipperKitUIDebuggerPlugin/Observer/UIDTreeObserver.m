/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#if FB_SONARKIT_ENABLED

#import "UIDTreeObserver.h"
#import "UIDAllyTraversal.h"
#import "UIDContext.h"
#import "UIDHierarchyTraversal.h"
#import "UIDTimeUtilities.h"

@implementation UIDTreeObserver

- (instancetype)init {
  self = [super init];
  if (self) {
    _children = [NSMutableDictionary new];
  }
  return self;
}

- (void)subscribe:(id)node {
}

- (void)unsubscribe {
}

- (void)processNode:(id)node withContext:(UIDContext*)context {
  [self processNode:node withSnapshot:false withContext:context];
}

- (void)setTraversalMode:(UIDTraversalMode)traversalMode {
  if (_traversalMode == traversalMode) {
    return;
  }
  _traversalMode = traversalMode;
  [UIDAllyTraversal setVoiceOverServiceEnabled:traversalMode ==
                    UIDTraversalModeAccessibilityHierarchy];
}

- (void)processNode:(id)node
       withSnapshot:(BOOL)snapshot
        withContext:(UIDContext*)context {
  NSTimeInterval timestamp = UIDPerformanceTimeIntervalSince1970();

  uint64_t t0 = UIDPerformanceNow();

  UIDNodeDescriptor* descriptor =
      [context.descriptorRegister descriptorForClass:[node class]];
  UIDNodeDescriptor* rootDescriptor = [context.descriptorRegister
      descriptorForClass:[context.application class]];

  NSArray* nodes;
  switch (_traversalMode) {
    case UIDTraversalModeViewHierarchy: {
      UIDHierarchyTraversal* const traversal = [UIDHierarchyTraversal
          createWithDescriptorRegister:context.descriptorRegister];
      nodes = [traversal traverse:node];
      break;
    }
    case UIDTraversalModeAccessibilityHierarchy: {
      UIDAllyTraversal* allyTraversal = [[UIDAllyTraversal alloc]
          initWithDescriptorRegister:context.descriptorRegister];
      nodes = [allyTraversal traverse:context.application root:node];
      break;
    }
    default:
      // Unexpected value, abort
      return;
  }

  uint64_t t1 = UIDPerformanceNow();

  UIImage* screenshot = [rootDescriptor snapshotForNode:context.application];

  uint64_t t2 = UIDPerformanceNow();

  UIDSubtreeUpdate* update = [UIDSubtreeUpdate new];
  update.observerType = _type;
  update.rootId = [descriptor identifierForNode:node];
  update.nodes = nodes;
  update.snapshot = screenshot;
  update.timestamp = timestamp;
  update.traversalMS = UIDMonotonicTimeConvertMachUnitsToMS(t1 - t0);
  update.snapshotMS = UIDMonotonicTimeConvertMachUnitsToMS(t2 - t1);

  [context.updateDigester digest:update];
}

- (void)cleanup {
}

@end

#endif
