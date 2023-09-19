/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.litho.descriptors.props

import android.graphics.drawable.ColorDrawable
import android.graphics.drawable.Drawable
import com.facebook.flipper.plugins.uidebugger.common.enumToInspectableSet
import com.facebook.flipper.plugins.uidebugger.descriptors.MetadataRegister
import com.facebook.flipper.plugins.uidebugger.model.*
import com.facebook.litho.DebugComponent
import com.facebook.yoga.*

object LayoutPropExtractor {
  private const val NAMESPACE = "LayoutPropExtractor"

  private var BackgroundId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "background")
  private var ForegroundId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "foreground")

  private val DirectionId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE,
          NAMESPACE,
          "direction",
          false,
          enumToInspectableSet<YogaDirection>())
  private val FlexDirectionId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE,
          NAMESPACE,
          "flexDirection",
          false,
          enumToInspectableSet<YogaFlexDirection>())
  private val JustifyContentId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE,
          NAMESPACE,
          "justifyContent",
          false,
          enumToInspectableSet<YogaJustify>())
  private val AlignItemsId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE,
          NAMESPACE,
          "alignItems",
          false,
          enumToInspectableSet<YogaAlign>())
  private val AlignSelfId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE,
          NAMESPACE,
          "alignSelf",
          false,
          enumToInspectableSet<YogaAlign>())
  private val AlignContentId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE,
          NAMESPACE,
          "alignContent",
          false,
          enumToInspectableSet<YogaAlign>())
  private val PositionTypeId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE,
          NAMESPACE,
          "positionType",
          false,
          enumToInspectableSet<YogaPositionType>())

  private val FlexGrowId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "flexGrow")
  private val FlexShrinkId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "flexShrink")
  private val FlexBasisId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "flexBasis")
  private val WidthId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "width")
  private val HeightId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "height")
  private val MinWidthId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "minWidth")
  private val MinHeightId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "minHeight")
  private val MaxWidthId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "maxWidth")
  private val MaxHeightId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "maxHeight")
  private val AspectRatioId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "aspectRatio")

  private val MarginId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "margin")
  private val PaddingId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "padding")
  private val BorderId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "border")
  private val PositionId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "position")

  private val LeftId = MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "left")
  private val TopId = MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "top")
  private val RightId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "right")
  private val BottomId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "bottom")
  private val StartId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "start")
  private val EndId = MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "end")
  private val HorizontalId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "horizontal")
  private val VerticalId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "vertical")
  private val AllId = MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "all")

  private val HasViewOutputId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "hasViewOutput")
  private val AlphaId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "alpha")
  private val ScaleId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "scale")
  private val RotationId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "rotation")

  private val EmptyId = MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "")
  private val NoneId = MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "none")
  private val SizeId = MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "size")
  private val ViewOutputId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "viewOutput")

  fun getInspectableBox(
      left: YogaValue?,
      top: YogaValue?,
      right: YogaValue?,
      bottom: YogaValue?,
      horizontal: YogaValue?,
      vertical: YogaValue?,
      all: YogaValue?,
      start: YogaValue?,
      end: YogaValue?
  ): InspectableObject {
    val props = mutableMapOf<MetadataId, Inspectable>()

    var actualLeft = 0
    var actualTop = 0
    var actualRight = 0
    var actualBottom = 0

    all?.let { yogaValue ->
      if (yogaValue.unit != YogaUnit.UNDEFINED) {
        if (yogaValue.unit == YogaUnit.POINT || yogaValue.unit == YogaUnit.PERCENT) {
          val intValue = yogaValue.value.toInt()
          actualLeft = intValue
          actualTop = intValue
          actualRight = intValue
          actualBottom = intValue
        }

        props[AllId] = InspectableValue.Text(yogaValue.toString())
      }
    }

    horizontal?.let { yogaValue ->
      if (yogaValue.unit != YogaUnit.UNDEFINED) {
        if (yogaValue.unit == YogaUnit.POINT || yogaValue.unit == YogaUnit.PERCENT) {
          val intValue = yogaValue.value.toInt()
          actualLeft = intValue
          actualRight = intValue
        }

        props[HorizontalId] = InspectableValue.Text(yogaValue.toString())
      }
    }

    vertical?.let { yogaValue ->
      if (yogaValue.unit != YogaUnit.UNDEFINED) {
        if (yogaValue.unit == YogaUnit.POINT || yogaValue.unit == YogaUnit.PERCENT) {
          val intValue = yogaValue.value.toInt()
          actualTop = intValue
          actualBottom = intValue
        }

        props[VerticalId] = InspectableValue.Text(yogaValue.toString())
      }
    }

    left?.let { yogaValue ->
      if (yogaValue.unit != YogaUnit.UNDEFINED) {
        if (yogaValue.unit == YogaUnit.POINT || yogaValue.unit == YogaUnit.PERCENT) {
          val intValue = yogaValue.value.toInt()
          actualLeft = intValue
        }

        props[LeftId] = InspectableValue.Text(yogaValue.toString())
      }
    }

    right?.let { yogaValue ->
      if (yogaValue.unit != YogaUnit.UNDEFINED) {
        if (yogaValue.unit == YogaUnit.POINT || yogaValue.unit == YogaUnit.PERCENT) {
          val intValue = yogaValue.value.toInt()
          actualRight = intValue
        }

        props[RightId] = InspectableValue.Text(yogaValue.toString())
      }
    }

    top?.let { yogaValue ->
      if (yogaValue.unit != YogaUnit.UNDEFINED) {
        if (yogaValue.unit == YogaUnit.POINT || yogaValue.unit == YogaUnit.PERCENT) {
          val intValue = yogaValue.value.toInt()
          actualTop = intValue
        }

        props[TopId] = InspectableValue.Text(yogaValue.toString())
      }
    }

    bottom?.let { yogaValue ->
      if (yogaValue.unit != YogaUnit.UNDEFINED) {
        if (yogaValue.unit == YogaUnit.POINT || yogaValue.unit == YogaUnit.PERCENT) {
          val intValue = yogaValue.value.toInt()
          actualBottom = intValue
        }

        props[BottomId] = InspectableValue.Text(yogaValue.toString())
      }
    }

    props[EmptyId] =
        InspectableValue.SpaceBox(SpaceBox(actualTop, actualRight, actualBottom, actualLeft))

    return InspectableObject(props)
  }

  fun getInspectableBoxRaw(
      left: Float?,
      top: Float?,
      right: Float?,
      bottom: Float?,
      horizontal: Float?,
      vertical: Float?,
      all: Float?,
      start: Float?,
      end: Float?
  ): InspectableObject {
    val props = mutableMapOf<MetadataId, Inspectable>()

    var actualLeft = 0
    var actualTop = 0
    var actualRight = 0
    var actualBottom = 0

    all?.let { value ->
      if (!value.isNaN()) {
        val intValue = value.toInt()
        actualLeft = intValue
        actualTop = intValue
        actualRight = intValue
        actualBottom = intValue
        props[AllId] = InspectableValue.Number(value)
      }
    }

    horizontal?.let { value ->
      if (!value.isNaN()) {
        val intValue = value.toInt()
        actualLeft = intValue
        actualRight = intValue
        props[HorizontalId] = InspectableValue.Number(value)
      }
    }

    vertical?.let { value ->
      if (!value.isNaN()) {
        val intValue = value.toInt()
        actualTop = intValue
        actualBottom = intValue
        props[VerticalId] = InspectableValue.Number(value)
      }
    }

    left?.let { value ->
      if (!value.isNaN()) {
        val intValue = value.toInt()
        actualLeft = intValue
        props[LeftId] = InspectableValue.Number(value)
      }
    }

    right?.let { value ->
      if (!value.isNaN()) {
        val intValue = value.toInt()
        actualRight = intValue
        props[RightId] = InspectableValue.Number(value)
      }
    }

    top?.let { value ->
      if (!value.isNaN()) {
        val intValue = value.toInt()
        actualTop = intValue
        props[TopId] = InspectableValue.Number(value)
      }
    }

    bottom?.let { value ->
      if (!value.isNaN()) {
        val intValue = value.toInt()
        actualBottom = intValue
        props[BottomId] = InspectableValue.Number(value)
      }
    }

    props[EmptyId] =
        InspectableValue.SpaceBox(SpaceBox(actualTop, actualRight, actualBottom, actualLeft))

    return InspectableObject(props)
  }

  fun getProps(component: DebugComponent): Map<MetadataId, Inspectable> {
    val props = mutableMapOf<MetadataId, Inspectable>()

    val layout = component.layoutNode ?: return props

    props[AlignItemsId] = InspectableValue.Enum(layout.alignItems.name)
    props[AlignSelfId] = InspectableValue.Enum(layout.alignSelf.name)
    props[AlignContentId] = InspectableValue.Enum(layout.alignContent.name)

    props[AspectRatioId] = InspectableValue.Text(layout.aspectRatio.toString())

    layout.background?.let { drawable -> props[BackgroundId] = fromDrawable(drawable) }

    props[DirectionId] = InspectableValue.Enum(layout.layoutDirection.name)

    props[FlexBasisId] = InspectableValue.Text(layout.flexBasis.toString())
    props[FlexDirectionId] = InspectableValue.Enum(layout.flexDirection.name)
    props[FlexGrowId] = InspectableValue.Text(layout.flexGrow.toString())
    props[FlexShrinkId] = InspectableValue.Text(layout.flexShrink.toString())

    layout.foreground?.let { drawable -> props[ForegroundId] = fromDrawable(drawable) }

    props[JustifyContentId] = InspectableValue.Enum(layout.justifyContent.name)

    props[PositionTypeId] = InspectableValue.Enum(layout.positionType.name)

    val size: MutableMap<MetadataId, Inspectable> = mutableMapOf()
    size[WidthId] = InspectableValue.Text(layout.width.toString())
    if (layout.minWidth.unit != YogaUnit.UNDEFINED)
        size[MinWidthId] = InspectableValue.Text(layout.minWidth.toString())
    if (layout.maxWidth.unit != YogaUnit.UNDEFINED)
        size[MaxWidthId] = InspectableValue.Text(layout.maxWidth.toString())
    size[HeightId] = InspectableValue.Text(layout.height.toString())
    if (layout.minHeight.unit != YogaUnit.UNDEFINED)
        size[MinHeightId] = InspectableValue.Text(layout.minHeight.toString())
    if (layout.maxHeight.unit != YogaUnit.UNDEFINED)
        size[MaxHeightId] = InspectableValue.Text(layout.maxHeight.toString())

    props[SizeId] = InspectableObject(size)

    props[MarginId] =
        getInspectableBox(
            layout.getMargin(YogaEdge.LEFT),
            layout.getMargin(YogaEdge.TOP),
            layout.getMargin(YogaEdge.RIGHT),
            layout.getMargin(YogaEdge.BOTTOM),
            layout.getMargin(YogaEdge.HORIZONTAL),
            layout.getMargin(YogaEdge.VERTICAL),
            layout.getMargin(YogaEdge.ALL),
            layout.getMargin(YogaEdge.START),
            layout.getMargin(YogaEdge.END))

    props[PaddingId] =
        getInspectableBox(
            layout.getPadding(YogaEdge.LEFT),
            layout.getPadding(YogaEdge.TOP),
            layout.getPadding(YogaEdge.RIGHT),
            layout.getPadding(YogaEdge.BOTTOM),
            layout.getPadding(YogaEdge.HORIZONTAL),
            layout.getPadding(YogaEdge.VERTICAL),
            layout.getPadding(YogaEdge.ALL),
            layout.getPadding(YogaEdge.START),
            layout.getPadding(YogaEdge.END))

    props[BorderId] =
        getInspectableBoxRaw(
            layout.getBorderWidth(YogaEdge.LEFT),
            layout.getBorderWidth(YogaEdge.TOP),
            layout.getBorderWidth(YogaEdge.RIGHT),
            layout.getBorderWidth(YogaEdge.BOTTOM),
            layout.getBorderWidth(YogaEdge.HORIZONTAL),
            layout.getBorderWidth(YogaEdge.VERTICAL),
            layout.getBorderWidth(YogaEdge.ALL),
            layout.getBorderWidth(YogaEdge.START),
            layout.getBorderWidth(YogaEdge.END))

    props[PositionId] =
        getInspectableBox(
            layout.getPosition(YogaEdge.LEFT),
            layout.getPosition(YogaEdge.TOP),
            layout.getPosition(YogaEdge.RIGHT),
            layout.getPosition(YogaEdge.BOTTOM),
            layout.getPosition(YogaEdge.HORIZONTAL),
            layout.getPosition(YogaEdge.VERTICAL),
            layout.getPosition(YogaEdge.ALL),
            layout.getPosition(YogaEdge.START),
            layout.getPosition(YogaEdge.END))

    val viewOutput: MutableMap<MetadataId, Inspectable> = mutableMapOf()
    viewOutput[HasViewOutputId] = InspectableValue.Boolean(layout.hasViewOutput())
    if (layout.hasViewOutput()) {
      viewOutput[AlphaId] = InspectableValue.Number(layout.alpha)
      viewOutput[RotationId] = InspectableValue.Number(layout.rotation)
      viewOutput[ScaleId] = InspectableValue.Number(layout.scale)
    }
    props[ViewOutputId] = InspectableObject(viewOutput)

    return props
  }

  private fun fromDrawable(d: Drawable?): Inspectable =
      when (d) {
        is ColorDrawable -> InspectableValue.Color(Color.fromColor(d.color))
        else -> InspectableValue.Unknown(d.toString())
      }
}
