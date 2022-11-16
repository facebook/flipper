/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.litho.descriptors

import com.facebook.flipper.plugins.uidebugger.descriptors.ChainedDescriptor
import com.facebook.flipper.plugins.uidebugger.descriptors.MetadataRegister
import com.facebook.flipper.plugins.uidebugger.model.Inspectable
import com.facebook.flipper.plugins.uidebugger.model.InspectableObject
import com.facebook.flipper.plugins.uidebugger.model.InspectableValue
import com.facebook.flipper.plugins.uidebugger.model.MetadataId
import com.facebook.litho.widget.TextDrawable

object TextDrawableDescriptor : ChainedDescriptor<TextDrawable>() {

  private const val NAMESPACE = "TextDrawable"
  private val SectionId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, NAMESPACE)

  override fun onGetName(node: TextDrawable): String = node.javaClass.simpleName

  private val TextAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "text")
  override fun onGetData(
      node: TextDrawable,
      attributeSections: MutableMap<MetadataId, InspectableObject>
  ) {
    val props =
        mapOf<Int, Inspectable>(TextAttributeId to InspectableValue.Text(node.text.toString()))

    attributeSections[SectionId] = InspectableObject(props)
  }
}
