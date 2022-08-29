/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

interface NodeDescriptor<T> {
  /** Initialize a descriptor. */
  fun init()

  /**
   * A globally unique ID used to identify a node in a hierarchy. If your node does not have a
   * globally unique ID it is fine to rely on [System.identityHashCode].
   */
  fun getId(node: T): String

  /**
   * The name used to identify this node in the inspector. Does not need to be unique. A good
   * default is to use the class name of the node.
   */
  fun getName(node: T): String

  /** The children this node exposes in the inspector. */
  fun getChildren(node: T, children: MutableList<Any>)

  /**
   * Get the data to show for this node in the sidebar of the inspector. The object will be showen
   * in order and with a header matching the given name.
   */
  fun getData(node: T, builder: MutableMap<String, Any?>)
}
