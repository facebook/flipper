/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

import android.graphics.drawable.ColorDrawable
import com.facebook.flipper.plugins.uidebugger.model.*

object ColorDrawableDescriptor : ChainedDescriptor<ColorDrawable>() {

  private const val NAMESPACE = "ColorDrawable"
  private var SectionId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, NAMESPACE)
  private var ColorAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "color")

  override fun onGetName(node: ColorDrawable): String = node.javaClass.simpleName

  override fun onGetAttributes(
      node: ColorDrawable,
      attributeSections: MutableMap<MetadataId, InspectableObject>
  ) {
    val props = mutableMapOf<Int, Inspectable>()
    props[ColorAttributeId] = InspectableValue.Color(Color.fromColor(node.color))

    attributeSections[SectionId] = InspectableObject(props.toMap())
  }
}
