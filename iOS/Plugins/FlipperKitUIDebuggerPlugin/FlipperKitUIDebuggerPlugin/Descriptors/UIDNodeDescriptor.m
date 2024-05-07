/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "UIDNodeDescriptor.h"

@implementation UIDNodeDescriptor

- (NSString*)identifierForNode:(id)node {
  return [NSString stringWithFormat:@"%ld", [node hash]];
}

- (NSString*)nameForNode:(id)node {
  return NSStringFromClass([node class]);
}

- (UIDInlineAttributes*)inlineAttributesForNode:(id)node {
  return nil;
}

- (UIDGenericAttributes*)hiddenAttributesForNode:(id)node {
  return nil;
}

- (UIDAttributes*)attributesForNode:(id)node {
  return [NSDictionary dictionary];
}

- (void)editAttributeForNode:(id)node
                   withValue:(id)value
                metadataPath:(NSArray<UIDMetadataId>*)metadataPath
                        hint:(UIDCompoundTypeHint)hint {
}

- (NSArray<id<NSObject>>*)childrenOfNode:(id)node {
  return [NSArray array];
}

- (NSSet<NSString*>*)tagsForNode:(id)node {
  return [NSSet set];
}

- (UIDBounds*)boundsForNode:(id)node {
  return nil;
}

- (id<NSObject>)activeChildForNode:(id)node {
  return nil;
}

- (UIImage*)snapshotForNode:(id)node {
  return nil;
}

@end

#endif
