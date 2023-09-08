/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.litho.descriptors

import com.facebook.flipper.plugins.uidebugger.descriptors.DescriptorRegister
import com.facebook.flipper.plugins.uidebugger.descriptors.Id
import com.facebook.flipper.plugins.uidebugger.descriptors.NodeDescriptor
import com.facebook.flipper.plugins.uidebugger.descriptors.OffsetChild
import com.facebook.flipper.plugins.uidebugger.litho.LithoTag
import com.facebook.flipper.plugins.uidebugger.model.Bounds
import com.facebook.flipper.plugins.uidebugger.model.InspectableObject
import com.facebook.flipper.plugins.uidebugger.model.MetadataId
import com.facebook.flipper.plugins.uidebugger.util.Immediate
import com.facebook.flipper.plugins.uidebugger.util.MaybeDeferred
import com.facebook.litho.ComponentTree
import com.facebook.litho.DebugComponent

class ComponentTreeDescriptor(val register: DescriptorRegister) : NodeDescriptor<ComponentTree> {

  private val qualifiedName = ComponentTree::class.qualifiedName ?: ""

  override fun getId(node: ComponentTree): Id = node.id

  override fun getBounds(node: ComponentTree): Bounds {
    val rootComponent = DebugComponent.getRootInstance(node)
    return if (rootComponent != null) {
      Bounds.fromRect(rootComponent.boundsInParentDebugComponent)
    } else {
      Bounds(0, 0, 0, 0)
    }
  }

  override fun getName(node: ComponentTree): String = "ComponentTree"

  override fun getQualifiedName(node: ComponentTree): String = qualifiedName

  override fun getChildren(node: ComponentTree): List<Any> {
    val result = mutableListOf<Any>()
    val debugComponent = DebugComponent.getRootInstance(node)
    if (debugComponent != null) {
      result.add(
          // we want the component tree to take the size and any offset so we reset this one
          OffsetChild.zero(
              debugComponent, register.descriptorForClassUnsafe(debugComponent.javaClass)))
    }
    return result
  }

  override fun getActiveChild(node: ComponentTree): Any? = null

  override fun getAttributes(
      node: ComponentTree
  ): MaybeDeferred<Map<MetadataId, InspectableObject>> {
    return Immediate(mapOf())
  }

  override fun getTags(node: ComponentTree): Set<String> = setOf(LithoTag, "TreeRoot")
}
