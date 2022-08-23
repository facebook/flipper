/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

/**
 * This class derives from Descriptor and provides a canonical implementation of ChainedDescriptor}.
 */
abstract class AbstractChainedDescriptor<T> : Descriptor<T>(), ChainedDescriptor<T> {
  private var mSuper: Descriptor<T>? = null

  override fun setSuper(superDescriptor: Descriptor<T>) {
    if (superDescriptor !== mSuper) {
      check(mSuper == null)
      mSuper = superDescriptor
    }
  }

  fun getSuper(): Descriptor<T>? {
    return mSuper
  }

  /** Initialize a descriptor. */
  override fun init() {
    mSuper?.init()
    onInit()
  }

  open fun onInit() {}

  /**
   * A globally unique ID used to identify a node in a hierarchy. If your node does not have a
   * globally unique ID it is fine to rely on [System.identityHashCode].
   */
  override fun getId(node: T): String {
    return onGetId(node)
  }

  abstract fun onGetId(node: T): String

  /**
   * The name used to identify this node in the inspector. Does not need to be unique. A good
   * default is to use the class name of the node.
   */
  override fun getName(node: T): String {
    return onGetName(node)
  }

  abstract fun onGetName(node: T): String

  /** The children this node exposes in the inspector. */
  override fun getChildren(node: T, children: MutableList<Any>) {
    mSuper?.getChildren(node, children)
    onGetChildren(node, children)
  }

  open fun onGetChildren(node: T, children: MutableList<Any>) {}

  /**
   * Get the data to show for this node in the sidebar of the inspector. The object will be showen
   * in order and with a header matching the given name.
   */
  override fun getData(node: T, builder: MutableMap<String, Any?>) {
    mSuper?.getData(node, builder)
    onGetData(node, builder)
  }

  open fun onGetData(node: T, builder: MutableMap<String, Any?>) {}
}
