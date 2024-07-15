/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import <UIKit/UIKit.h>
#import "UIDBounds.h"
#import "UIDCompoundTypeHint.h"
#import "UIDInspectable.h"
#import "UIDMetadata.h"

NS_ASSUME_NONNULL_BEGIN

@interface UIDNodeDescriptor<__covariant T> : NSObject

/**
  A globally unique ID used to identify a node in the hierarchy.
 */
- (NSString*)identifierForNode:(T)node;

/**
  The name used to identify this node in the inspector.  Does not need to be
  unique. A good default is to use the class name of the node.
 */
- (NSString*)nameForNode:(T)node;

/**
  Get the attributes to show for this node in the sidebar of the inspector. The
  object will be shown in order and with a header matching the given name.
  */
- (UIDAttributes*)attributesForNode:(T)node;

- (void)editAttributeForNode:(T)node
                   withValue:(id)value
                metadataPath:(NSArray<UIDMetadataId>*)metadataPath
                        hint:(UIDCompoundTypeHint)hint;

/**
  These are shown inline in the tree view on the desktop, will likely be removed
  in the future.
 */
- (UIDInlineAttributes*)inlineAttributesForNode:(T)node;

/**
  These contain additional contextual data (currently: Bloks node metadata).
 */
- (UIDGenericAttributes*)hiddenAttributesForNode:(T)node;

/** The children this node exposes in the inspector. */
- (NSArray<id<NSObject>>*)childrenOfNode:(T)node;

/** Should be w.r.t the direct parent */
- (UIDBounds*)boundsForNode:(T)node;

/**
  If the type has the concept of overlapping children, then this indicates
  which child is active / on top, we will only listen to / traverse this child.
  If return null we assume all children are 'active'.
 */
- (id<NSObject>)activeChildForNode:(T)node;

/** Get a snapshot of the node.  */
- (UIImage*)snapshotForNode:(T)node;

/**
  Set of tags to describe this node in an abstract way for the UI. Unfortunately
  this can't be an enum as we have to plugin 3rd party frameworks dynamically.
 */
- (NSSet<NSString*>*)tagsForNode:(T)node;

@end

NS_ASSUME_NONNULL_END

#endif
