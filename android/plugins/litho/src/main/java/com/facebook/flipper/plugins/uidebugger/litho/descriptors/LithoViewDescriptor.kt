/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.litho.descriptors

import com.facebook.flipper.plugins.uidebugger.descriptors.ChainedDescriptor
import com.facebook.flipper.plugins.uidebugger.descriptors.MetadataRegister
import com.facebook.flipper.plugins.uidebugger.model.InspectableObject
import com.facebook.flipper.plugins.uidebugger.model.InspectableValue
import com.facebook.flipper.plugins.uidebugger.model.MetadataId
import com.facebook.litho.DebugComponent
import com.facebook.litho.LithoView

object LithoViewDescriptor : ChainedDescriptor<LithoView>() {

  private const val NAMESPACE = "LithoView"
  private val SectionId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, NAMESPACE)

  override fun onGetName(node: LithoView): String = node.javaClass.simpleName

  override fun onGetChildren(node: LithoView): List<Any> {
    val result = mutableListOf<Any>()
    val debugComponent = DebugComponent.getRootInstance(node)
    if (debugComponent != null) {
      result.add(debugComponent)
    }
    return result
  }

  private val IsIncrementalMountEnabledAttributeId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "isIncrementalMountEnabled")

  override fun onGetData(
      node: LithoView,
      attributeSections: MutableMap<MetadataId, InspectableObject>
  ) {
    attributeSections[SectionId] =
        InspectableObject(
            mapOf(
                IsIncrementalMountEnabledAttributeId to
                    InspectableValue.Boolean(node.isIncrementalMountEnabled)))
  }
}
