/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

import android.widget.ImageView
import android.widget.ImageView.ScaleType
import com.facebook.flipper.plugins.uidebugger.common.EnumMapping
import com.facebook.flipper.plugins.uidebugger.model.Inspectable
import com.facebook.flipper.plugins.uidebugger.model.InspectableObject
import com.facebook.flipper.plugins.uidebugger.model.MetadataId

object ImageViewDescriptor : ChainedDescriptor<ImageView>() {

  private const val NAMESPACE = "ImageView"

  private var SectionId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, NAMESPACE)
  private var ScaleTypeAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "scaleType")

  override fun onGetName(node: ImageView): String = node.javaClass.simpleName

  override fun onGetData(
      node: ImageView,
      attributeSections: MutableMap<MetadataId, InspectableObject>
  ) {
    val props = mutableMapOf<Int, Inspectable>()
    props[ScaleTypeAttributeId] = scaleTypeMapping.toInspectable(node.scaleType)

    attributeSections[SectionId] = InspectableObject(props)
  }

  private val scaleTypeMapping: EnumMapping<ScaleType> =
      object :
          EnumMapping<ScaleType>(
              mapOf(
                  "CENTER" to ScaleType.CENTER,
                  "CENTER_CROP" to ScaleType.CENTER_CROP,
                  "CENTER_INSIDE" to ScaleType.CENTER_INSIDE,
                  "FIT_CENTER" to ScaleType.FIT_CENTER,
                  "FIT_END" to ScaleType.FIT_END,
                  "FIT_START" to ScaleType.FIT_START,
                  "FIT_XY" to ScaleType.FIT_XY,
                  "MATRIX" to ScaleType.MATRIX,
              )) {}
}
