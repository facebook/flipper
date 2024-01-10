/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import <Foundation/Foundation.h>
#import "UIDNodeDescriptor.h"

NS_ASSUME_NONNULL_BEGIN

/**
   A chained descriptor is a special type of descriptor that models the
   inheritance hierarchy in native UI frameworks. With this setup you can define
   a descriptor for each class in the inheritance chain and given that we record
   the super class's descriptor we can automatically aggregate the results for
   each descriptor in the inheritance hierarchy in a chain.

   The result is that each descriptor in the inheritance chain only exports the
   attributes that it knows about but we still get all the attributes from the
   parent classes.
 */
@interface UIDChainedDescriptor<__covariant T> : UIDNodeDescriptor<T>

@property(strong, nonatomic) UIDChainedDescriptor* parent;

/** The children this node exposes in the inspector. */
- (NSArray<id<NSObject>>*)aggregateChildrenOfNode:(T)node;

/**
  Get the attributes to show for this node in the sidebar of the inspector. The
  object will be shown in order and with a header matching the given name.
  */
- (void)aggregateAttributes:(UIDMutableAttributes*)attributes forNode:(id)node;

/**
  These are shown inline in the tree view on the desktop, will likely be removed
  in the future.
 */
- (void)aggregateInlineAttributes:(UIDMutableInlineAttributes*)attributes
                          forNode:(id)node;

- (NSSet<NSString*>*)aggregateTagsForNode:(id)node;

@end

NS_ASSUME_NONNULL_END

#endif
