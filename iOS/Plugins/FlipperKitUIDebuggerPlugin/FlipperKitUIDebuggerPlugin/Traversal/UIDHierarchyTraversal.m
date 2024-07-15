/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "UIDHierarchyTraversal.h"
#import "UIDNode.h"

@interface UIDTransientNode : NSObject

@property(nonatomic) id node;
@property(nonatomic, nullable) NSString* parent;
@property(nonatomic) BOOL shallow;

- (instancetype)initWithNode:(id)node;
- (instancetype)initWithNode:(id)node parent:(NSString*)parent;

@end

@implementation UIDTransientNode

- (instancetype)initWithNode:(id)node {
  return [self initWithNode:node parent:nil];
}

- (instancetype)initWithNode:(id)node parent:(NSString*)parent {
  if (self = [super init]) {
    _node = node;
    _parent = parent;
    _shallow = NO;
  }
  return self;
}

@end

@implementation UIDHierarchyTraversal

- (instancetype)initWithDescriptorRegister:
    (UIDDescriptorRegister*)descriptorRegister {
  self = [super init];
  if (self) {
    self.descriptorRegister = descriptorRegister;
  }
  return self;
}

+ (instancetype)createWithDescriptorRegister:
    (UIDDescriptorRegister*)descriptorRegister {
  return [[UIDHierarchyTraversal alloc]
      initWithDescriptorRegister:descriptorRegister];
}

- (NSArray<UIDNode*>*)traverse:(id)root {
  if (root == nil) {
    return [NSArray array];
  }

  NSMutableArray<UIDNode*>* nodes = [NSMutableArray new];

  NSMutableArray<UIDTransientNode*>* stack = [NSMutableArray new];
  [stack addObject:[[UIDTransientNode alloc] initWithNode:root]];

  while (stack.count > 0) {
    UIDTransientNode* transientNode = [stack lastObject];
    [stack removeLastObject];

    id node = transientNode.node;

    UIDNodeDescriptor* descriptor =
        [self.descriptorRegister descriptorForClass:[node class]];

    NSString* nodeIdentifier = [descriptor identifierForNode:node];

    UIDNode* uidNode =
        [[UIDNode alloc] initWithIdentifier:nodeIdentifier
                              qualifiedName:[descriptor nameForNode:node]
                                       name:[descriptor nameForNode:node]
                                     bounds:[descriptor boundsForNode:node]
                                       tags:[descriptor tagsForNode:node]];

    uidNode.inlineAttributes = [descriptor inlineAttributesForNode:node];
    uidNode.hiddenAttributes = [descriptor hiddenAttributesForNode:node];
    uidNode.parent = transientNode.parent;

    if (transientNode.shallow) {
      // Not interested in attributes nor traversing the hierarchy formed
      // under this node, so children and attributes will be empty.
      [nodes addObject:uidNode];
      continue;
    }

    NSArray* children = [descriptor childrenOfNode:node];
    id<NSObject> activeChild = [descriptor activeChildForNode:node];
    NSString* activeChildId = nil;
    if (activeChild != nil) {
      UIDNodeDescriptor* activeChildDescriptor =
          [self.descriptorRegister descriptorForClass:[activeChild class]];
      activeChildId = [activeChildDescriptor identifierForNode:activeChild];
    }

    NSMutableArray* childrenIds = [NSMutableArray new];
    for (id child in children) {
      UIDNodeDescriptor* childDescriptor =
          [self.descriptorRegister descriptorForClass:[child class]];
      assert(childDescriptor != nil);
      [childrenIds addObject:[childDescriptor identifierForNode:child]];

      UIDTransientNode* transientChildNode =
          [[UIDTransientNode alloc] initWithNode:child parent:nodeIdentifier];

      // This is a child which is not active, so mark it as to not
      // traverse its children.
      if (activeChild != nil && activeChild != child) {
        transientChildNode.shallow = YES;
      }
      [stack addObject:transientChildNode];
    }

    uidNode.children = childrenIds;
    uidNode.activeChild = activeChildId;
    uidNode.attributes = [descriptor attributesForNode:node];

    [nodes addObject:uidNode];
  }

  return nodes;
}

- (id<NSObject>)findWithId:(NSString*)nodeId inHierarchyWithRoot:(id)root {
  if (root == nil) {
    return nil;
  }

  NSMutableArray<UIDTransientNode*>* stack = [NSMutableArray new];
  [stack addObject:root];

  while (stack.count) {
    id node = [stack lastObject];
    [stack removeLastObject];

    UIDNodeDescriptor* descriptor =
        [self.descriptorRegister descriptorForClass:[node class]];

    NSString* nodeIdentifier = [descriptor identifierForNode:node];

    if ([nodeIdentifier isEqualToString:nodeId]) {
      return node;
    }

    NSArray* children = [descriptor childrenOfNode:node];
    [stack addObjectsFromArray:children];
  }

  return nil;
}

@end

#endif
