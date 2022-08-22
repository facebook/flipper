/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

class ObjectDescriptor : Descriptor<Any>() {
  override fun init() {}

  override fun getId(obj: Any): String {
    return Integer.toString(System.identityHashCode(obj))
  }

  override fun getName(obj: Any): String {
    return obj.javaClass.simpleName
  }

  override fun getChildren(node: Any, children: MutableList<Any>) {}

  override fun getData(obj: Any, builder: MutableMap<String, Any?>) {}
}
