/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "UIDChainedDescriptor.h"
#import "UIDInspectable.h"

@implementation UIDChainedDescriptor

- (NSSet<NSString*>*)tagsForNode:(id)node {
  NSSet* tags = [self aggregateTagsForNode:node] ?: [_parent tagsForNode:node];
  return tags ?: [NSSet set];
}

- (NSSet<NSString*>*)aggregateTagsForNode:(id)node {
  return nil;
}

- (UIDBounds*)boundsForNode:(id)node {
  return [_parent boundsForNode:node];
}

- (id<NSObject>)activeChildForNode:(id)node {
  return [_parent activeChildForNode:node];
}

- (UIImage*)snapshotForNode:(id)node {
  return [_parent snapshotForNode:node];
}

- (NSArray<id<NSObject>>*)childrenOfNode:(id)node {
  NSArray<id<NSObject>>* children = [self aggregateChildrenOfNode:node];
  if (!children) {
    children = [_parent childrenOfNode:node];
  }

  return children != NULL ? children : [NSArray array];
}

- (NSArray<id<NSObject>>*)aggregateChildrenOfNode:(id)node {
  return nil;
}

- (UIDAttributes*)attributesForNode:(id)node {
  UIDMutableAttributes* attributes = [NSMutableDictionary new];
  [self aggregateAttributes:attributes forNode:node];

  UIDChainedDescriptor* currentDescriptor = _parent;
  while (currentDescriptor) {
    [currentDescriptor aggregateAttributes:attributes forNode:node];
    currentDescriptor = currentDescriptor.parent;
  }

  return attributes;
}

- (void)editAttributeForNode:(id)node
                   withValue:(id)value
                metadataPath:(NSArray<UIDMetadataId>*)metadataPath
                        hint:(UIDCompoundTypeHint)hint {
  UIDChainedDescriptor* currentDescriptor = self;
  while (currentDescriptor) {
    [currentDescriptor aggregateEditAttributeForNode:node
                                           withValue:value
                                        metadataPath:metadataPath
                                                hint:hint];
    currentDescriptor = currentDescriptor.parent;
  }
}

- (void)aggregateEditAttributeForNode:(id)node
                            withValue:(id)value
                         metadataPath:(NSArray<UIDMetadataId>*)metadataPath
                                 hint:(UIDCompoundTypeHint)hint {
}

- (void)aggregateAttributes:(UIDMutableAttributes*)attributes forNode:(id)node {
}

- (UIDInlineAttributes*)inlineAttributesForNode:(id)node {
  UIDMutableInlineAttributes* attributes = [NSMutableDictionary new];

  [attributes addEntriesFromDictionary:[super inlineAttributesForNode:node]];

  [self aggregateInlineAttributes:attributes forNode:node];

  UIDChainedDescriptor* currentDescriptor = _parent;
  while (currentDescriptor) {
    [currentDescriptor aggregateInlineAttributes:attributes forNode:node];
    currentDescriptor = currentDescriptor.parent;
  }

  return attributes;
}

- (void)aggregateInlineAttributes:(UIDMutableInlineAttributes*)attributes
                          forNode:(id)node {
}

@end

#endif
