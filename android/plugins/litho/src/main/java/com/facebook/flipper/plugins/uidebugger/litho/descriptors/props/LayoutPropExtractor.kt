/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.litho.descriptors.props

import android.graphics.drawable.ColorDrawable
import android.graphics.drawable.Drawable
import com.facebook.flipper.core.FlipperDynamic
import com.facebook.flipper.plugins.uidebugger.descriptors.MetadataRegister
import com.facebook.flipper.plugins.uidebugger.model.*
import com.facebook.flipper.plugins.uidebugger.util.ColorUtil
import com.facebook.flipper.plugins.uidebugger.util.enumToInspectableSet
import com.facebook.litho.DebugComponent
import com.facebook.litho.DebugLayoutNodeEditor
import com.facebook.yoga.*
import java.util.Locale

object LayoutPropExtractor {
  private const val NAMESPACE = "LayoutPropExtractor"

  private var BackgroundId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "background", mutable = true)
  private var ForegroundId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "foreground", mutable = true)

  private val DirectionId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE,
          NAMESPACE,
          "direction",
          mutable = true,
          enumToInspectableSet<YogaDirection>())
  private val FlexDirectionId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE,
          NAMESPACE,
          "flexDirection",
          mutable = true,
          enumToInspectableSet<YogaFlexDirection>())
  private val JustifyContentId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE,
          NAMESPACE,
          "justifyContent",
          mutable = true,
          enumToInspectableSet<YogaJustify>())
  private val AlignItemsId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE,
          NAMESPACE,
          "alignItems",
          mutable = true,
          enumToInspectableSet<YogaAlign>())
  private val AlignSelfId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE,
          NAMESPACE,
          "alignSelf",
          mutable = true,
          enumToInspectableSet<YogaAlign>())
  private val AlignContentId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE,
          NAMESPACE,
          "alignContent",
          mutable = true,
          enumToInspectableSet<YogaAlign>())
  private val PositionTypeId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE,
          NAMESPACE,
          "positionType",
          mutable = true,
          enumToInspectableSet<YogaPositionType>())

  private val FlexGrowId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "flexGrow", mutable = true)
  private val FlexShrinkId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "flexShrink", mutable = true)
  private val FlexBasisId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "flexBasis", mutable = true)
  private val WidthId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "width", mutable = true)
  private val HeightId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "height", mutable = true)
  private val MinWidthId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "minWidth", mutable = true)
  private val MinHeightId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "minHeight", mutable = true)
  private val MaxWidthId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "maxWidth", mutable = true)
  private val MaxHeightId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "maxHeight", mutable = true)
  private val AspectRatioId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "aspectRatio", mutable = true)

  private val MarginId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "margin", mutable = true)
  private val PaddingId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "padding", mutable = true)
  private val BorderId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "border", mutable = true)
  private val PositionId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "position", mutable = true)

  private val LeftId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "left", mutable = true)
  private val TopId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "top", mutable = true)
  private val RightId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "right", mutable = true)
  private val BottomId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "bottom", mutable = true)
  private val StartId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "start", mutable = true)
  private val EndId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "end", mutable = true)
  private val HorizontalId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "horizontal", mutable = true)
  private val VerticalId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "vertical", mutable = true)
  private val AllId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "all", mutable = true)

  private val HasViewOutputId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "hasViewOutput", mutable = false)
  private val AlphaId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE,
          NAMESPACE,
          "alpha",
          mutable = true,
          minValue = 0,
          maxValue = 1)
  private val ScaleId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "scale", mutable = true)
  private val RotationId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "rotation", mutable = true)

  private val ResolvedId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "resolved", mutable = true)
  private val SizeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "size", mutable = true)
  private val ViewOutputId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "viewOutput", mutable = true)

  /** constructs an object type containing any inputs that were provided and the resolved values */
  private fun getInspectableBox(
      leftInput: Inspectable?,
      topInput: Inspectable?,
      rightInput: Inspectable?,
      bottomInput: Inspectable?,
      horizontalInput: Inspectable?,
      verticalInput: Inspectable?,
      allInput: Inspectable?,
      startInput: Inspectable?,
      endInput: Inspectable?,
      leftResolved: Float?,
      topResolved: Float?,
      rightResolved: Float?,
      bottomResolved: Float?,
  ): InspectableObject {
    val props = mutableMapOf<MetadataId, Inspectable>()

    allInput?.let { props[AllId] = it }
    horizontalInput?.let { props[HorizontalId] = it }
    verticalInput?.let { props[VerticalId] = it }
    leftInput?.let { props[LeftId] = it }
    rightInput?.let { props[RightId] = it }
    topInput?.let { props[TopId] = it }
    bottomInput?.let { props[BottomId] = it }
    startInput?.let { props[StartId] = it }
    endInput?.let { props[EndId] = it }

    if (leftResolved != null &&
        rightResolved != null &&
        topResolved != null &&
        bottomResolved != null) {
      props[ResolvedId] =
          InspectableValue.SpaceBox(
              SpaceBox(
                  left = leftResolved.toInt(),
                  right = rightResolved.toInt(),
                  bottom = bottomResolved.toInt(),
                  top = topResolved.toInt()))
    }

    return InspectableObject(props)
  }

  private fun toInspectable(yogaValue: YogaValue) =
      if (yogaValue.unit != YogaUnit.UNDEFINED) {
        InspectableValue.Text(yogaValue.toString())
      } else {
        null
      }

  private fun toInspectable(value: Float) =
      if (value.isNaN()) {
        null
      } else {
        InspectableValue.Number(value)
      }

  fun applyLayoutOverride(
      node: DebugLayoutNodeEditor,
      path: List<Metadata>,
      value: FlipperDynamic
  ) {
    when (path[0].id) {
      BackgroundId -> node.setBackgroundColor(ColorUtil.toColorInt(value))
      ForegroundId -> node.setForegroundColor(ColorUtil.toColorInt(value))
      DirectionId ->
          node.setLayoutDirection(
              YogaDirection.valueOf(value.asString()!!.uppercase(Locale.getDefault())))
      FlexDirectionId ->
          node.setFlexDirection(
              YogaFlexDirection.valueOf(value.asString()!!.uppercase(Locale.getDefault())))
      JustifyContentId ->
          node.setJustifyContent(
              YogaJustify.valueOf(value.asString()!!.uppercase(Locale.getDefault())))
      AlignItemsId ->
          node.setAlignItems(YogaAlign.valueOf(value.asString()!!.uppercase(Locale.getDefault())))
      AlignSelfId ->
          node.setAlignSelf(YogaAlign.valueOf(value.asString()!!.uppercase(Locale.getDefault())))
      AlignContentId ->
          node.setAlignContent(YogaAlign.valueOf(value.asString()!!.uppercase(Locale.getDefault())))
      PositionTypeId ->
          node.setPositionType(
              YogaPositionType.valueOf(value.asString()!!.uppercase(Locale.getDefault())))
      FlexGrowId -> node.setFlexGrow(value.asFloat())
      FlexShrinkId -> node.setFlexShrink(value.asFloat())
      FlexBasisId -> node.setFlexBasis(YogaValue.parse(value.asString()))
      MinWidthId -> node.setMinWidth(YogaValue.parse(value.asString()))
      MaxWidthId -> node.setMaxWidth(YogaValue.parse(value.asString()))
      MinHeightId -> node.setMinHeight(YogaValue.parse(value.asString()))
      MaxHeightId -> node.setMaxHeight(YogaValue.parse(value.asString()))
      AspectRatioId -> node.setAspectRatio(value.asFloat())
      SizeId -> {
        when (path[1].id) {
          WidthId -> node.setWidth(YogaValue.parse(value.asString()))
          HeightId -> node.setHeight(YogaValue.parse(value.asString()))
        }
      }
      AlphaId -> node.setAlpha(value.asFloat())
      ScaleId -> node.setScale(value.asFloat())
      RotationId -> node.setRotation(value.asFloat())
    }
  }

  fun getProps(component: DebugComponent): Map<MetadataId, Inspectable> {
    val props = mutableMapOf<MetadataId, Inspectable>()

    val layout = component.layoutNode ?: return props

    props[AlignItemsId] = InspectableValue.Enum(layout.alignItems.name)
    props[AlignSelfId] = InspectableValue.Enum(layout.alignSelf.name)
    props[AlignContentId] = InspectableValue.Enum(layout.alignContent.name)

    props[AspectRatioId] = InspectableValue.Number(layout.aspectRatio)

    layout.background?.let { drawable -> props[BackgroundId] = fromDrawable(drawable) }

    props[DirectionId] = InspectableValue.Enum(layout.layoutDirection.name)

    props[FlexBasisId] = InspectableValue.Text(layout.flexBasis.toString())
    props[FlexDirectionId] = InspectableValue.Enum(layout.flexDirection.name)
    props[FlexGrowId] = InspectableValue.Number(layout.flexGrow)
    props[FlexShrinkId] = InspectableValue.Number(layout.flexShrink)

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
            leftInput = toInspectable(layout.getMargin(YogaEdge.LEFT)),
            topInput = toInspectable(layout.getMargin(YogaEdge.TOP)),
            rightInput = toInspectable(layout.getMargin(YogaEdge.RIGHT)),
            bottomInput = toInspectable(layout.getMargin(YogaEdge.BOTTOM)),
            horizontalInput = toInspectable(layout.getMargin(YogaEdge.HORIZONTAL)),
            verticalInput = toInspectable(layout.getMargin(YogaEdge.VERTICAL)),
            allInput = toInspectable(layout.getMargin(YogaEdge.ALL)),
            startInput = toInspectable(layout.getMargin(YogaEdge.START)),
            endInput = toInspectable(layout.getMargin(YogaEdge.END)),
            leftResolved = layout.getLayoutMargin(YogaEdge.LEFT),
            rightResolved = layout.getLayoutMargin(YogaEdge.RIGHT),
            topResolved = layout.getLayoutMargin(YogaEdge.TOP),
            bottomResolved = layout.getLayoutMargin(YogaEdge.BOTTOM),
        )

    props[PaddingId] =
        getInspectableBox(
            leftInput = toInspectable(layout.getPadding(YogaEdge.LEFT)),
            topInput = toInspectable(layout.getPadding(YogaEdge.TOP)),
            rightInput = toInspectable(layout.getPadding(YogaEdge.RIGHT)),
            bottomInput = toInspectable(layout.getPadding(YogaEdge.BOTTOM)),
            horizontalInput = toInspectable(layout.getPadding(YogaEdge.HORIZONTAL)),
            verticalInput = toInspectable(layout.getPadding(YogaEdge.VERTICAL)),
            allInput = toInspectable(layout.getPadding(YogaEdge.ALL)),
            startInput = toInspectable(layout.getPadding(YogaEdge.START)),
            endInput = toInspectable(layout.getPadding(YogaEdge.END)),
            leftResolved = layout.getLayoutPadding(YogaEdge.LEFT),
            rightResolved = layout.getLayoutPadding(YogaEdge.RIGHT),
            topResolved = layout.getLayoutPadding(YogaEdge.TOP),
            bottomResolved = layout.getLayoutPadding(YogaEdge.BOTTOM))

    props[BorderId] =
        getInspectableBox(
            toInspectable(layout.getBorderWidth(YogaEdge.LEFT)),
            toInspectable(layout.getBorderWidth(YogaEdge.TOP)),
            toInspectable(layout.getBorderWidth(YogaEdge.RIGHT)),
            toInspectable(layout.getBorderWidth(YogaEdge.BOTTOM)),
            toInspectable(layout.getBorderWidth(YogaEdge.HORIZONTAL)),
            toInspectable(layout.getBorderWidth(YogaEdge.VERTICAL)),
            toInspectable(layout.getBorderWidth(YogaEdge.ALL)),
            toInspectable(layout.getBorderWidth(YogaEdge.START)),
            toInspectable(layout.getBorderWidth(YogaEdge.END)),
            null, // todo expose layout border from litho
            null,
            null,
            null)

    props[PositionId] =
        getInspectableBox(
            toInspectable(layout.getPosition(YogaEdge.LEFT)),
            toInspectable(layout.getPosition(YogaEdge.TOP)),
            toInspectable(layout.getPosition(YogaEdge.RIGHT)),
            toInspectable(layout.getPosition(YogaEdge.BOTTOM)),
            toInspectable(layout.getPosition(YogaEdge.HORIZONTAL)),
            toInspectable(layout.getPosition(YogaEdge.VERTICAL)),
            toInspectable(layout.getPosition(YogaEdge.ALL)),
            toInspectable(layout.getPosition(YogaEdge.START)),
            toInspectable(layout.getPosition(YogaEdge.END)),
            null,
            null,
            null,
            null)

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
