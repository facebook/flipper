/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.litho

import com.facebook.flipper.plugins.uidebugger.common.InspectableObject
import com.facebook.flipper.plugins.uidebugger.descriptors.NodeDescriptor
import com.facebook.litho.DebugComponent
import com.facebook.litho.LithoView

object LithoViewDescriptor : NodeDescriptor<LithoView> {
  override fun getId(node: LithoView): String = System.identityHashCode(node).toString()

  override fun getName(node: LithoView): String = "LithoView"

  override fun getChildren(node: LithoView): List<Any> {
    val result = mutableListOf<Any>()
    val debugComponent = DebugComponent.getRootInstance(node)
    if (debugComponent != null) {
      result.add(debugComponent)
    }
    return result
  }

  override fun getActiveChild(node: LithoView): Any? = null

  override fun getData(node: LithoView) = mapOf<String, InspectableObject>()
}

object DebugComponentDescriptor : NodeDescriptor<DebugComponent> {
  override fun getId(node: DebugComponent): String = System.identityHashCode(node).toString()

  override fun getName(node: DebugComponent): String {
    return node.component.simpleName
  }

  override fun getChildren(node: DebugComponent): List<Any> {
    val result = mutableListOf<Any>()

    val mountedView = node.mountedView
    val mountedDrawable = node.mountedDrawable

    if (mountedView != null) {
      result.add(mountedView)
    } else if (mountedDrawable != null) {
      result.add(mountedDrawable)
    } else {
      for (child in node.childComponents) {
        result.add(child)
      }
    }

    return result
  }

  override fun getActiveChild(node: DebugComponent): Any? = null

  override fun getData(node: DebugComponent) = mapOf<String, InspectableObject>()
}
