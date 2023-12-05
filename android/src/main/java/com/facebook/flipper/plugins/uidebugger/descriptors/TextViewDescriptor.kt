/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

import android.graphics.Typeface
import android.os.Build
import android.widget.TextView
import com.facebook.flipper.core.FlipperDynamic
import com.facebook.flipper.plugins.uidebugger.model.Color
import com.facebook.flipper.plugins.uidebugger.model.Inspectable
import com.facebook.flipper.plugins.uidebugger.model.InspectableObject
import com.facebook.flipper.plugins.uidebugger.model.InspectableValue
import com.facebook.flipper.plugins.uidebugger.model.Metadata
import com.facebook.flipper.plugins.uidebugger.model.MetadataId
import com.facebook.flipper.plugins.uidebugger.util.ColorUtil

object TextViewDescriptor : ChainedDescriptor<TextView>() {

  private const val NAMESPACE = "TextView"

  private var SectionId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, NAMESPACE)
  private val TextAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "text", mutable = true)
  private val TextSizeAttributeId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "textSize", mutable = true, minValue = 0)
  private val TextColorAttributeId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "textColor", mutable = true)
  private val IsBoldAttributeId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "isBold", mutable = true)
  private val IsItalicAttributeId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "isItalic", mutable = true)
  private val WeightAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "weight", minValue = 0)
  private val TypefaceAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "typeface")
  private val MinLinesAttributeId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "minLines", mutable = true, minValue = 0)
  private val MaxLinesAttributeId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "maxLines", mutable = true)
  private val MinWidthAttributeId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "minWidth", mutable = true, minValue = 0)
  private val MaxWidthAttributeId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "maxWidth", mutable = true)

  override fun onGetName(node: TextView): String = node.javaClass.simpleName

  override fun onGetAttributes(
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

  override fun onEditAttribute(
      node: TextView,
      metadataPath: List<Metadata>,
      value: FlipperDynamic,
      hint: CompoundTypeHint?
  ) {
    if (metadataPath.first().id != SectionId) {
      return
    }

    when (metadataPath.last().id) {
      TextAttributeId -> node.text = value.asString()
      TextSizeAttributeId ->
          node.textSize = value.asFloat() / node.context.resources.displayMetrics.density
      MinLinesAttributeId -> node.minLines = value.asInt()
      MaxLinesAttributeId -> node.maxLines = value.asInt()
      MinWidthAttributeId -> node.minWidth = value.asInt()
      MaxWidthAttributeId -> node.maxWidth = value.asInt()
      TextColorAttributeId -> node.setTextColor(ColorUtil.toColorInt(value))
      // technically one overwrites the other but oh well
      IsBoldAttributeId ->
          node.typeface =
              Typeface.create(
                  node.typeface, if (value.asBoolean()) Typeface.BOLD else Typeface.NORMAL)
      IsItalicAttributeId ->
          node.typeface =
              Typeface.create(
                  node.typeface, if (value.asBoolean()) Typeface.ITALIC else Typeface.NORMAL)
    }
  }
}
