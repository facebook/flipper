/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

import android.os.Build
import android.view.View
import android.view.ViewGroup
import androidx.core.view.ViewGroupCompat
import com.facebook.flipper.core.FlipperDynamic
import com.facebook.flipper.plugins.uidebugger.core.FragmentTracker
import com.facebook.flipper.plugins.uidebugger.model.*
import com.facebook.flipper.plugins.uidebugger.util.EnumMapping

object ViewGroupDescriptor : ChainedDescriptor<ViewGroup>() {

  private val LayoutModeMapping: EnumMapping<Int> =
      object :
          EnumMapping<Int>(
              mapOf(
                  "LAYOUT_MODE_CLIP_BOUNDS" to ViewGroupCompat.LAYOUT_MODE_CLIP_BOUNDS,
                  "LAYOUT_MODE_OPTICAL_BOUNDS" to ViewGroupCompat.LAYOUT_MODE_OPTICAL_BOUNDS,
              )) {}

  private const val NAMESPACE = "ViewGroup"
  private var SectionId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, NAMESPACE)

  override fun onGetName(node: ViewGroup): String {
    return node.javaClass.simpleName
  }

  override fun onGetChildren(node: ViewGroup): List<Any> {
    val children = mutableListOf<Any>()

    val count = node.childCount - 1
    for (i in 0..count) {
      val child: View = node.getChildAt(i)
      val fragment = FragmentTracker.getFragment(child)

      if (fragment != null) {
        children.add(fragment)
      } else children.add(child)
    }

    return children
  }

  private val LayoutModeAttributeId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE,
          NAMESPACE,
          "layoutMode",
          mutable = true,
          LayoutModeMapping.getInspectableValues(),
      )
  private val ClipChildrenAttributeId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "clipChildren", mutable = true)
  private val ClipToPaddingAttributeId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "clipToPadding", mutable = true)

  override fun onGetAttributes(
      node: ViewGroup,
      attributeSections: MutableMap<MetadataId, InspectableObject>
  ) {

    val props = mutableMapOf<Int, Inspectable>()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR2) {
      props[LayoutModeAttributeId] = LayoutModeMapping.toInspectable(node.layoutMode)
      props[ClipChildrenAttributeId] = InspectableValue.Boolean(node.clipChildren)
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      props[ClipToPaddingAttributeId] = InspectableValue.Boolean(node.clipToPadding)
    }

    attributeSections[SectionId] = InspectableObject(props)
  }

  override fun onEditAttribute(
      node: ViewGroup,
      metadataPath: List<Metadata>,
      value: FlipperDynamic,
      hint: CompoundTypeHint?
  ) {
    if (metadataPath.first().id != SectionId) {
      return
    }

    when (metadataPath.last().id) {
      LayoutModeAttributeId ->
          node.layoutMode = LayoutModeMapping.getEnumValue(value.asString() ?: "unknown")
      ClipChildrenAttributeId -> node.clipChildren = value.asBoolean()
      ClipToPaddingAttributeId -> node.clipToPadding = value.asBoolean()
    }
    node.forceLayout()
    node.invalidate()
  }
}
