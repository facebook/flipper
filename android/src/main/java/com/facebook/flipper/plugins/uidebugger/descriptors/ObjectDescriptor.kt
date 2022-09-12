/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

import com.facebook.flipper.plugins.uidebugger.common.InspectableObject

object ObjectDescriptor : Descriptor<Any>() {

  override fun getActiveChild(node: Any): Any? = null

  override fun getId(node: Any): String {
    return System.identityHashCode(node).toString()
  }

  override fun getName(node: Any): String {
    return node.javaClass.simpleName
  }

  override fun getChildren(node: Any, children: MutableList<Any>) {}

  override fun getData(node: Any, builder: MutableMap<String, InspectableObject>) {}
}
