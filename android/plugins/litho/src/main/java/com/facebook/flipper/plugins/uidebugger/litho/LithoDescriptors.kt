/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.litho

import com.facebook.flipper.plugins.uidebugger.common.InspectableObject
import com.facebook.flipper.plugins.uidebugger.descriptors.Descriptor
import com.facebook.litho.DebugComponent
import com.facebook.litho.LithoView

object LithoViewDescriptor : Descriptor<LithoView>() {
  override fun getId(node: LithoView): String = System.identityHashCode(node).toString()

  override fun getName(node: LithoView): String = "LithoView"

  override fun getChildren(node: LithoView, children: MutableList<Any>) {
    val debugComponent = DebugComponent.getRootInstance(node)
    if (debugComponent != null) {
      children.add(debugComponent)
    }
  }

  override fun getActiveChild(node: LithoView): Any? = null

  override fun getData(node: LithoView, builder: MutableMap<String, InspectableObject>) {}
}

object DebugComponentDescriptor : Descriptor<DebugComponent>() {
  override fun getId(node: DebugComponent): String = System.identityHashCode(node).toString()

  override fun getName(node: DebugComponent): String {
    return node.component.simpleName
  }

  // TODO the mutable list thing doesnt make sense for non chained descriptors, should just return
  override fun getChildren(node: DebugComponent, children: MutableList<Any>) {
    val mountedView = node.mountedView
    val mountedDrawable = node.mountedDrawable

    if (mountedView != null) {
      children.add(mountedView)
    } else if (mountedDrawable != null) {
      children.add(mountedDrawable)
    } else {
      for (child in node.childComponents) {
        children.add(child)
      }
    }
  }

  override fun getActiveChild(node: DebugComponent): Any? = null

  // todo same here
  override fun getData(node: DebugComponent, builder: MutableMap<String, InspectableObject>) {}
}
