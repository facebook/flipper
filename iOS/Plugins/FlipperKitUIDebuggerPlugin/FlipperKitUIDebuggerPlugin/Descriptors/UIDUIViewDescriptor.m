/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "UIDUIViewDescriptor.h"
#import "UIView+UIDDescriptor.h"

@implementation UIDUIViewDescriptor

- (void)aggregateAttributes:(UIDMutableAttributes*)attributes
                    forNode:(UIView*)node {
  [node UID_aggregateAttributes:attributes];
}

- (NSArray<id<NSObject>>*)childrenOfNode:(UIView*)node {
  return [node UID_children];
}

- (UIImage*)snapshotForNode:(UIView*)node {
  return [node UID_snapshot];
}

- (UIDBounds*)boundsForNode:(UIView*)node {
  return [node UID_bounds];
}

- (void)aggregateEditAttributeForNode:(id)node
                            withValue:(id)value
                         metadataPath:(NSArray<UIDMetadataId>*)metadataPath
                                 hint:(UIDCompoundTypeHint)hint {
  return [node UID_aggregateEditAttributeWithValue:value
                                      metadataPath:metadataPath
                                              hint:hint];
}

- (UIDGenericAttributes*)hiddenAttributesForNode:(UIView*)node {
  if (node.isHidden) {
    return @{
      @"invisible" : @(node.isHidden),
    };
  }
  return nil;
}

@end

#endif
