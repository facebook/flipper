/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

import android.os.Build
import android.widget.TextView
import com.facebook.flipper.plugins.uidebugger.model.Color
import com.facebook.flipper.plugins.uidebugger.model.Inspectable
import com.facebook.flipper.plugins.uidebugger.model.InspectableObject
import com.facebook.flipper.plugins.uidebugger.model.InspectableValue
import com.facebook.flipper.plugins.uidebugger.model.MetadataId

object TextViewDescriptor : ChainedDescriptor<TextView>() {

  private const val NAMESPACE = "TextView"

  private var SectionId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, NAMESPACE)
  private val TextAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "text")
  private val TextSizeAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "textSize")
  private val TextColorAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "textColor")
  private val IsBoldAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "isBold")
  private val IsItalicAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "isItalic")
  private val WeightAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "weight")
  private val TypefaceAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "typeface")
  private val MinLinesAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "minLines")
  private val MaxLinesAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "maxLines")
  private val MinWidthAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "minWidth")
  private val MaxWidthAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "maxWidth")

  override fun onGetName(node: TextView): String = node.javaClass.simpleName

  override fun onGetData(
      node: TextView,
      attributeSections: MutableMap<MetadataId, InspectableObject>
  ) {

    val props =
        mutableMapOf<Int, Inspectable>(
            TextAttributeId to InspectableValue.Text(node.text.toString()),
            TextSizeAttributeId to InspectableValue.Number(node.textSize),
            TextColorAttributeId to
                InspectableValue.Color(Color.fromColor(node.textColors.defaultColor)))

    val typeface = node.typeface
    if (typeface != null) {
      val typeFaceProp =
          mutableMapOf<Int, InspectableValue>(
              IsBoldAttributeId to InspectableValue.Boolean(typeface.isBold),
              IsItalicAttributeId to InspectableValue.Boolean(typeface.isItalic),
          )

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
        typeFaceProp[WeightAttributeId] = InspectableValue.Number(typeface.weight)
      }

      props[TypefaceAttributeId] = InspectableObject(typeFaceProp)
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR1) {
      props[MinLinesAttributeId] = InspectableValue.Number(node.minLines)
      props[MaxLinesAttributeId] = InspectableValue.Number(node.maxLines)
      props[MinWidthAttributeId] = InspectableValue.Number(node.minWidth)
      props[MaxWidthAttributeId] = InspectableValue.Number(node.maxWidth)
    }

    attributeSections[SectionId] = InspectableObject(props)
  }
}
