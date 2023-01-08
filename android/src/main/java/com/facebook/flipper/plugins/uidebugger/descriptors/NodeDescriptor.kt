/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

import android.graphics.Bitmap
import com.facebook.flipper.plugins.uidebugger.model.Bounds
import com.facebook.flipper.plugins.uidebugger.model.InspectableObject
import com.facebook.flipper.plugins.uidebugger.model.MetadataId
import com.facebook.flipper.plugins.uidebugger.util.MaybeDeferred

/*
 Descriptors are an extension point used during traversal to extract data out of arbitrary
 objects in the hierarchy. Descriptors can represent native view or declarative components or
 any type of object such as an activity

 Descriptors should be stateless and each descriptor should be a singleton
*/

object BaseTags {

  const val Declarative = "Declarative"
  const val Native = "Native"
  const val Accessibility = "Accessibility"
  const val Android = "Android"
  const val Unknown = "Unknown"
  val NativeAndroid = setOf(Android, Native)
  val AccessibleNativeAndroid = setOf(Android, Native, Accessibility)
}

typealias Id = Int

interface NodeDescriptor<T> {

  /** Used to detect the same node across traversals */
  fun getId(node: T): Id = System.identityHashCode(node)

  /** Should be w.r.t the direct parent */
  fun getBounds(node: T): Bounds

  /**
   * The name used to identify this node in the inspector. Does not need to be unique. A good
   * default is to use the class name of the node.
   */
  fun getName(node: T): String

  /**
   * The qualified name used to identify this node in the inspector. Does not need to be unique. A
   * good default is to use the class qualified name of the node.
   */
  fun getQualifiedName(node: T): String

  /** The children this node exposes in the inspector. */
  fun getChildren(node: T): List<Any>

  /**
   * Get a snapshot of the node. Bitmaps are not cheap to create, so accept one as an optional
   * parameter. If a bitmap is provided, it will be used by the canvas to draw on it. Otherwise, a
   * bitmap will be created.
   */
  fun getSnapshot(node: T, bitmap: Bitmap?): Bitmap?

  /**
   * If you have overlapping children this indicates which child is active / on top, we will only
   * listen to / traverse this child. If return null we assume all children are 'active'
   */
  fun getActiveChild(node: T): Any?

  /**
   * Get the attribute to show for this node in the sidebar of the inspector. The object first level
   * is a section and subsequent objects within are the first level of that section. Nested objects
   * will nest in the sidebar
   */
  fun getAttributes(node: T): MaybeDeferred<Map<MetadataId, InspectableObject>>

  /**
   * Set of tags to describe this node in an abstract way for the UI Unfortunately this can't be an
   * enum as we have to plugin 3rd party frameworks dynamically
   */
  fun getTags(node: T): Set<String>

  /**
   * These are shown inline in the tree view on the desktop, will likely be removed in the future
   */
  fun getInlineAttributes(node: T): Map<String, String> = mutableMapOf()
}
