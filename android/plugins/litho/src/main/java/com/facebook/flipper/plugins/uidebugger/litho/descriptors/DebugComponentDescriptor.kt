/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.litho.descriptors

import android.graphics.Bitmap
import com.facebook.flipper.plugins.uidebugger.descriptors.*
import com.facebook.flipper.plugins.uidebugger.litho.LithoTag
import com.facebook.flipper.plugins.uidebugger.model.Bounds
import com.facebook.flipper.plugins.uidebugger.model.InspectableObject
import com.facebook.flipper.plugins.uidebugger.model.MetadataId
import com.facebook.litho.DebugComponent

class DebugComponentDescriptor(val register: DescriptorRegister) : NodeDescriptor<DebugComponent> {
  private val NAMESPACE = "DebugComponent"

  override fun getName(node: DebugComponent): String {
    return node.component.simpleName
  }

  override fun getChildren(node: DebugComponent): List<Any> {
    val result = mutableListOf<Any>()

    val mountedView = node.mountedView
    val mountedDrawable = node.mountedDrawable

    if (mountedView != null) {
      val descriptor: NodeDescriptor<Any> = register.descriptorForClassUnsafe(mountedView.javaClass)
      /**
       * When we ask android for the bounds the x,y offset is w.r.t to the nearest android parent
       * view group. From UI debuggers perspective using the raw android offset will double the
       * total offset of this native view as the offset is included by the litho components between
       * the mounted view and its native parent
       */
      result.add(OffsetChild.zero(mountedView, descriptor))
    } else if (mountedDrawable != null) {
      /**
       * don't emit mounted drawables since they are leaf nodes and its somewhat tricky to get the
       * wireframe bounds to play nice. Something to address later if there is feedback
       */
    } else {
      for (child in node.childComponents) {
        result.add(child)
      }
    }

    return result
  }

  override fun getActiveChild(node: DebugComponent): Any? = null

  private val LayoutId =
      MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "Litho Layout")
  private val UserPropsId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "User Props")
  override fun getData(node: DebugComponent): Map<MetadataId, InspectableObject> {
    val attributeSections = mutableMapOf<MetadataId, InspectableObject>()

    return attributeSections
  }

  override fun getBounds(node: DebugComponent): Bounds =
      Bounds.fromRect(node.boundsInParentDebugComponent)

  override fun getTags(node: DebugComponent): Set<String> = setOf(BaseTags.Declarative, LithoTag)

  override fun getSnapshot(node: DebugComponent, bitmap: Bitmap?): Bitmap? = null
}
