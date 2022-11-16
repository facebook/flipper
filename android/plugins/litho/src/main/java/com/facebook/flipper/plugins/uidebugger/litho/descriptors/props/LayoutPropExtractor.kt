/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.litho.descriptors.props

import android.graphics.drawable.ColorDrawable
import android.graphics.drawable.Drawable
import com.facebook.flipper.plugins.uidebugger.descriptors.MetadataRegister
import com.facebook.flipper.plugins.uidebugger.model.*
import com.facebook.litho.DebugComponent
import com.facebook.yoga.*

object LayoutPropExtractor {
  private const val NAMESPACE = "LayoutPropExtractor"

  private var BackgroundId =
      MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "background")
  private var ForegroundId =
      MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "foreground")

  private val DirectionId =
      MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "direction")
  private val FlexDirectionId =
      MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "flexDirection")
  private val JustifyContentId =
      MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "justifyContent")
  private val AlignItemsId =
      MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "alignItems")
  private val AlignSelfId =
      MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "alignSelf")
  private val AlignContentId =
      MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "alignContent")
  private val PositionTypeId =
      MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "positionType")

  private val FlexGrowId =
      MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "flexGrow")
  private val FlexShrinkId =
      MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "flexShrink")
  private val FlexBasisId =
      MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "flexBasis")
  private val WidthId = MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "width")
  private val HeightId =
      MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "height")
  private val MinWidthId =
      MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "minWidth")
  private val MinHeightId =
      MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "minHeight")
  private val MaxWidthId =
      MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "maxWidth")
  private val MaxHeightId =
      MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "maxHeight")
  private val AspectRatioId =
      MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "aspectRatio")

  private val MarginId =
      MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "margin")
  private val PaddingId =
      MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "padding")
  private val BorderId =
      MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "border")
  private val PositionId =
      MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "position")

  private val LeftId = MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "left")
  private val TopId = MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "top")
  private val RightId = MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "right")
  private val BottomId =
      MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "bottom")
  private val StartId = MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "start")
  private val EndId = MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "end")
  private val HorizontalId =
      MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "horizontal")
  private val VerticalId =
      MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "vertical")
  private val AllId = MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "all")

  private val HasViewOutputId =
      MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "hasViewOutput")
  private val AlphaId = MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "alpha")
  private val ScaleId = MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "scale")
  private val RotationId =
      MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "rotation")

  fun getProps(component: DebugComponent): Map<MetadataId, Inspectable> {
    val props = mutableMapOf<MetadataId, Inspectable>()

    val layout = component.layoutNode ?: return props

    layout.background?.let { drawable -> props[BackgroundId] = fromDrawable(drawable) }
    layout.foreground?.let { drawable -> props[ForegroundId] = fromDrawable(drawable) }

    props[DirectionId] =
        InspectableValue.Enum(Enumeration(enumToSet<YogaDirection>(), layout.layoutDirection.name))

    props[FlexDirectionId] =
        InspectableValue.Enum(
            Enumeration(enumToSet<YogaFlexDirection>(), layout.flexDirection.name))
    props[JustifyContentId] =
        InspectableValue.Enum(Enumeration(enumToSet<YogaJustify>(), layout.justifyContent.name))
    props[AlignItemsId] =
        InspectableValue.Enum(Enumeration(enumToSet<YogaAlign>(), layout.alignItems.name))
    props[AlignSelfId] =
        InspectableValue.Enum(Enumeration(enumToSet<YogaAlign>(), layout.alignSelf.name))
    props[AlignContentId] =
        InspectableValue.Enum(Enumeration(enumToSet<YogaAlign>(), layout.alignContent.name))
    props[PositionTypeId] =
        InspectableValue.Enum(Enumeration(enumToSet<YogaPositionType>(), layout.positionType.name))

    props[FlexGrowId] = InspectableValue.Text(layout.flexGrow.toString())
    props[FlexShrinkId] = InspectableValue.Text(layout.flexShrink.toString())
    props[FlexBasisId] = InspectableValue.Text(layout.flexBasis.toString())

    props[WidthId] = InspectableValue.Text(layout.width.toString())
    props[MinWidthId] = InspectableValue.Text(layout.minWidth.toString())
    props[MaxWidthId] = InspectableValue.Text(layout.maxWidth.toString())

    props[HeightId] = InspectableValue.Text(layout.height.toString())
    props[MinHeightId] = InspectableValue.Text(layout.minHeight.toString())
    props[MaxHeightId] = InspectableValue.Text(layout.maxHeight.toString())

    props[AspectRatioId] = InspectableValue.Text(layout.aspectRatio.toString())

    val marginProps = mutableMapOf<MetadataId, Inspectable>()
    marginProps[LeftId] = InspectableValue.Text(layout.getMargin(YogaEdge.LEFT).toString())
    marginProps[TopId] = InspectableValue.Text(layout.getMargin(YogaEdge.TOP).toString())
    marginProps[RightId] = InspectableValue.Text(layout.getMargin(YogaEdge.RIGHT).toString())
    marginProps[BottomId] = InspectableValue.Text(layout.getMargin(YogaEdge.BOTTOM).toString())
    marginProps[StartId] = InspectableValue.Text(layout.getMargin(YogaEdge.START).toString())
    marginProps[EndId] = InspectableValue.Text(layout.getMargin(YogaEdge.END).toString())
    marginProps[HorizontalId] =
        InspectableValue.Text(layout.getMargin(YogaEdge.HORIZONTAL).toString())
    marginProps[VerticalId] = InspectableValue.Text(layout.getMargin(YogaEdge.VERTICAL).toString())
    marginProps[AllId] = InspectableValue.Text(layout.getMargin(YogaEdge.ALL).toString())

    props[MarginId] = InspectableObject(marginProps)

    val paddingProps = mutableMapOf<MetadataId, Inspectable>()
    paddingProps[LeftId] = InspectableValue.Text(layout.getPadding(YogaEdge.LEFT).toString())
    paddingProps[TopId] = InspectableValue.Text(layout.getPadding(YogaEdge.TOP).toString())
    paddingProps[RightId] = InspectableValue.Text(layout.getPadding(YogaEdge.RIGHT).toString())
    paddingProps[BottomId] = InspectableValue.Text(layout.getPadding(YogaEdge.BOTTOM).toString())
    paddingProps[StartId] = InspectableValue.Text(layout.getPadding(YogaEdge.START).toString())
    paddingProps[EndId] = InspectableValue.Text(layout.getPadding(YogaEdge.END).toString())
    paddingProps[HorizontalId] =
        InspectableValue.Text(layout.getPadding(YogaEdge.HORIZONTAL).toString())
    paddingProps[VerticalId] =
        InspectableValue.Text(layout.getPadding(YogaEdge.VERTICAL).toString())
    paddingProps[AllId] = InspectableValue.Text(layout.getPadding(YogaEdge.ALL).toString())

    props[PaddingId] = InspectableObject(paddingProps)

    val borderProps = mutableMapOf<MetadataId, Inspectable>()
    borderProps[LeftId] = InspectableValue.Text(layout.getBorderWidth(YogaEdge.LEFT).toString())
    borderProps[TopId] = InspectableValue.Text(layout.getBorderWidth(YogaEdge.TOP).toString())
    borderProps[RightId] = InspectableValue.Text(layout.getBorderWidth(YogaEdge.RIGHT).toString())
    borderProps[BottomId] = InspectableValue.Text(layout.getBorderWidth(YogaEdge.BOTTOM).toString())
    borderProps[StartId] = InspectableValue.Text(layout.getBorderWidth(YogaEdge.START).toString())
    borderProps[EndId] = InspectableValue.Text(layout.getBorderWidth(YogaEdge.END).toString())
    borderProps[HorizontalId] =
        InspectableValue.Text(layout.getBorderWidth(YogaEdge.HORIZONTAL).toString())
    borderProps[VerticalId] =
        InspectableValue.Text(layout.getBorderWidth(YogaEdge.VERTICAL).toString())
    borderProps[AllId] = InspectableValue.Text(layout.getBorderWidth(YogaEdge.ALL).toString())

    props[BorderId] = InspectableObject(borderProps)

    val positionProps = mutableMapOf<MetadataId, Inspectable>()
    positionProps[LeftId] = InspectableValue.Text(layout.getPosition(YogaEdge.LEFT).toString())
    positionProps[TopId] = InspectableValue.Text(layout.getPosition(YogaEdge.TOP).toString())
    positionProps[RightId] = InspectableValue.Text(layout.getPosition(YogaEdge.RIGHT).toString())
    positionProps[BottomId] = InspectableValue.Text(layout.getPosition(YogaEdge.BOTTOM).toString())
    positionProps[StartId] = InspectableValue.Text(layout.getPosition(YogaEdge.START).toString())
    positionProps[EndId] = InspectableValue.Text(layout.getPosition(YogaEdge.END).toString())
    positionProps[HorizontalId] =
        InspectableValue.Text(layout.getPosition(YogaEdge.HORIZONTAL).toString())
    positionProps[VerticalId] =
        InspectableValue.Text(layout.getPosition(YogaEdge.VERTICAL).toString())
    positionProps[AllId] = InspectableValue.Text(layout.getPosition(YogaEdge.ALL).toString())

    props[PositionId] = InspectableObject(positionProps)

    props[HasViewOutputId] = InspectableValue.Boolean(layout.hasViewOutput())
    if (layout.hasViewOutput()) {
      props[AlphaId] = InspectableValue.Number(layout.alpha)
      props[ScaleId] = InspectableValue.Number(layout.scale)
      props[RotationId] = InspectableValue.Number(layout.rotation)
    }

    return props
  }

  private fun fromDrawable(d: Drawable?): Inspectable =
      when (d) {
        is ColorDrawable -> InspectableValue.Color(Color.fromColor(d.color))
        else -> InspectableValue.Unknown(d.toString())
      }

  private inline fun <reified T : Enum<T>> enumerator(): Iterator<T> = enumValues<T>().iterator()
  private inline fun <reified T : Enum<T>> enumToSet(): Set<String> {
    val set = mutableSetOf<String>()
    val values = enumerator<T>()
    values.forEach { set.add(it.name) }
    return set
  }
}
