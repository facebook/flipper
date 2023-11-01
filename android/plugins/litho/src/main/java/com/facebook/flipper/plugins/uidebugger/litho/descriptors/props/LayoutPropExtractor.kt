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

  private val ResolvedId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "resolved")
  private val NoneId = MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "none")
  private val SizeId = MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "size")
  private val ViewOutputId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "viewOutput")

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
