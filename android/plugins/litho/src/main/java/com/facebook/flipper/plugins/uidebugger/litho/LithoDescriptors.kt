/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.litho

import com.facebook.flipper.plugins.uidebugger.common.InspectableObject
import com.facebook.flipper.plugins.uidebugger.descriptors.BaseTags
import com.facebook.flipper.plugins.uidebugger.descriptors.DescriptorRegister
import com.facebook.flipper.plugins.uidebugger.descriptors.NodeDescriptor
import com.facebook.flipper.plugins.uidebugger.descriptors.SectionName
import com.facebook.flipper.plugins.uidebugger.model.Bounds
import com.facebook.litho.DebugComponent
import com.facebook.litho.LithoView

object LithoViewDescriptor : NodeDescriptor<LithoView> {

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

  override fun getBounds(node: LithoView): Bounds? = null

  override fun getTags(node: LithoView): Set<String> = setOf()
}

const val LithoTag = "Litho"

/** a drawable or view that is mounted, along with the correct descriptor */
class MountedObject(val obj: Any, val descriptor: NodeDescriptor<Any>)

object MountedObjectDescriptor : NodeDescriptor<MountedObject> {

  override fun getBounds(node: MountedObject): Bounds? {
    val bounds = node.descriptor.getBounds(node.obj)

    /**
     * When we ask android for the bounds the x,y offset is w.r.t to the nearest android parent view
     * group. From UI debuggers perspective using the raw android offset will double the total
     * offset of this native view as the offset is included by the litho components between the
     * mounted view and its native parent
     */
    return bounds?.copy(x = 0, y = 0)
  }

  override fun getName(node: MountedObject): String = node.descriptor.getName(node.obj)

  override fun getChildren(node: MountedObject): List<Any> = node.descriptor.getChildren(node.obj)

  override fun getActiveChild(node: MountedObject): Any? = node.descriptor.getActiveChild(node.obj)

  override fun getData(node: MountedObject): Map<SectionName, InspectableObject> =
      node.descriptor.getData(node.obj)

  override fun getTags(node: MountedObject): Set<String> = node.descriptor.getTags(node.obj)
}

class DebugComponentDescriptor(val register: DescriptorRegister) : NodeDescriptor<DebugComponent> {

  override fun getName(node: DebugComponent): String {
    return node.component.simpleName
  }

  override fun getChildren(node: DebugComponent): List<Any> {
    val result = mutableListOf<Any>()

    val mountedView = node.mountedView
    val mountedDrawable = node.mountedDrawable

    if (mountedView != null) {
      val descriptor: NodeDescriptor<Any> = register.descriptorForClassUnsafe(mountedView.javaClass)
      result.add(MountedObject(mountedView, descriptor))
    } else if (mountedDrawable != null) {
      val descriptor: NodeDescriptor<Any> =
          register.descriptorForClassUnsafe(mountedDrawable.javaClass)
      result.add(MountedObject(mountedDrawable, descriptor))
    } else {
      for (child in node.childComponents) {
        result.add(child)
      }
    }

    return result
  }

  override fun getActiveChild(node: DebugComponent): Any? = null

  override fun getData(node: DebugComponent) = mapOf<String, InspectableObject>()
  override fun getBounds(node: DebugComponent): Bounds {
    val bounds = node.bounds
    return Bounds(bounds.left, bounds.top, bounds.width(), bounds.height())
  }

  override fun getTags(node: DebugComponent): Set<String> = setOf(BaseTags.Declarative, LithoTag)
}
