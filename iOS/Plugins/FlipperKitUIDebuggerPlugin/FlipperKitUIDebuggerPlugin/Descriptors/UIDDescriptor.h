/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import <UIKit/UIKit.h>
#import "UIDBounds.h"
#import "UIDInspectable.h"

NS_ASSUME_NONNULL_BEGIN

@protocol UIDDescriptor<NSObject>

/**
  A globally unique ID used to identify a node in the hierarchy.
 */
- (NSUInteger)UID_identifier;

/**
  The name used to identify this node in the inspector.  Does not need to be
  unique. A good default is to use the class name of the node.
 */
- (NSString*)UID_name;

/**
  Get the attributes to show for this node in the sidebar of the inspector. The
  object will be shown in order and with a header matching the given name.
  */
- (void)UID_aggregateAttributes:(UIDMutableAttributes*)attributes;

@optional

/**
  These are shown inline in the tree view on the desktop, will likely be removed
  in the future.
 */
- (UIDInlineAttributes*)UID_inlineAttributes;

/** The children this node exposes in the inspector. */
- (NSArray<id<NSObject>>*)UID_children;

/** Should be w.r.t the direct parent */
- (UIDBounds*)UID_bounds;

/**
  If the type has the concept of overlapping children, then this indicates
  which child is active / on top, we will only listen to / traverse this child.
  If return null we assume all children are 'active'.
 */
- (id<NSObject>)UID_activeChild;

/** Get a snapshot of the node.  */
- (UIImage*)UID_snapshot;

/**
  Set of tags to describe this node in an abstract way for the UI. Unfortunately
  this can't be an enum as we have to plugin 3rd party frameworks dynamically.
 */
- (NSSet<NSString*>*)UID_tags;

@end

NS_ASSUME_NONNULL_END

#endif
