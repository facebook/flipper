/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

import android.annotation.SuppressLint
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Rect
import android.graphics.drawable.ColorDrawable
import android.graphics.drawable.Drawable
import android.os.Build
import android.util.SparseArray
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.LinearLayout
import androidx.core.widget.NestedScrollView
import androidx.viewpager.widget.ViewPager
import com.facebook.flipper.plugins.uidebugger.common.*
import com.facebook.flipper.plugins.uidebugger.model.*
import com.facebook.flipper.plugins.uidebugger.util.ResourcesUtil
import java.lang.reflect.Field

object ViewDescriptor : ChainedDescriptor<View>() {

  private const val NAMESPACE = "View"

  private var SectionId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, NAMESPACE)
  private val PositionAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "position")
  private val GlobalPositionAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "globalPosition")
  private val SizeAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "size")
  private val BoundsAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "bounds")
  private val PaddingAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "padding")
  private val LocalVisibleRectAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "localVisibleRect")
  private val RotationAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "rotation")
  private val ScaleAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "scale")
  private val PivotAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "pivot")
  private val LayoutParamsAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "layoutParams")
  private val LayoutDirectionAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "layoutDirection")
  private val TranslationAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "translation")
  private val ElevationAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "elevation")
  private val VisibilityAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "visibility")

  private val BackgroundAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "background")
  private val ForegroundAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "foreground")

  private val AlphaAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "alpha")
  private val StateAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "state")

  private val StateEnabledAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "enabled")
  private val StateActivatedAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "activated")
  private val StateFocusedAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "focused")
  private val StateSelectedAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "selected")

  private val TextDirectionAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "textDirection")
  private val TextAlignmentAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "textAlignment")

  private val TagAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "tag")
  private val KeyedTagsAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "keyedTags")

  private val WidthAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "width")
  private val HeightAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "height")

  private val MarginAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "margin")
  private val WeightAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "weight")
  private val GravityAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_LAYOUT, NAMESPACE, "gravity")

  override fun onGetName(node: View): String = node.javaClass.simpleName

  override fun onGetBounds(node: View): Bounds {

    if (node.parent is ViewPager) {
      // override
      return Bounds(0, 0, node.width, node.height)
    }

    var offsetX = 0
    var offsetY = 0
    if (node.parent is NestedScrollView) {
      /**
       * when a node is a child of nested scroll view android does not adjust the left/ top as the
       * view scrolls. This seems to be unique to nested scroll view so we have this trick to find
       * its actual position.
       */
      val localVisible = Rect()
      node.getLocalVisibleRect(localVisible)
      offsetX = localVisible.left
      offsetY = localVisible.top
    }

    return Bounds(
        node.left + node.translationX.toInt() - offsetX,
        node.top + node.translationY.toInt() - offsetY,
        node.width,
        node.height)
  }

  override fun onGetTags(node: View): Set<String> = BaseTags.NativeAndroid

  override fun onGetData(node: View, attributeSections: MutableMap<MetadataId, InspectableObject>) {

    val props = mutableMapOf<Int, Inspectable>()

    val positionOnScreen = IntArray(2)
    node.getLocationOnScreen(positionOnScreen)

    val localVisible = Rect()
    node.getLocalVisibleRect(localVisible)

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
      props[PositionAttributeId] =
          InspectableValue.Coordinate3D(Coordinate3D(node.x, node.y, node.z))
    } else {
      props[PositionAttributeId] = InspectableValue.Coordinate(Coordinate(node.x, node.y))
    }

    props[GlobalPositionAttributeId] =
        InspectableValue.Coordinate(Coordinate(positionOnScreen[0], positionOnScreen[1]))

    props[SizeAttributeId] = InspectableValue.Size(Size(node.width, node.height))

    props[BoundsAttributeId] =
        InspectableValue.Bounds(Bounds(node.left, node.top, node.right, node.bottom))
    props[PaddingAttributeId] =
        InspectableValue.SpaceBox(
            SpaceBox(node.paddingTop, node.paddingRight, node.paddingBottom, node.paddingLeft))

    props[LocalVisibleRectAttributeId] =
        InspectableObject(
            mapOf(
                PositionAttributeId to
                    InspectableValue.Coordinate(Coordinate(localVisible.left, localVisible.top)),
                SizeAttributeId to
                    InspectableValue.Size(Size(localVisible.width(), localVisible.height()))),
        )

    props[RotationAttributeId] =
        InspectableValue.Coordinate3D(Coordinate3D(node.rotationX, node.rotationY, node.rotation))
    props[ScaleAttributeId] = InspectableValue.Coordinate(Coordinate(node.scaleX, node.scaleY))
    props[PivotAttributeId] = InspectableValue.Coordinate(Coordinate(node.pivotX, node.pivotY))

    props[LayoutParamsAttributeId] = getLayoutParams(node)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR1) {
      props[LayoutDirectionAttributeId] = LayoutDirectionMapping.toInspectable(node.layoutDirection)
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      props[TranslationAttributeId] =
          InspectableValue.Coordinate3D(
              Coordinate3D(node.translationX, node.translationY, node.translationZ))
    } else {
      props[TranslationAttributeId] =
          InspectableValue.Coordinate(Coordinate(node.translationX, node.translationY))
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      props[ElevationAttributeId] = InspectableValue.Number(node.elevation)
    }

    props[VisibilityAttributeId] = VisibilityMapping.toInspectable(node.visibility)

    fromDrawable(node.background)?.let { background -> props[BackgroundAttributeId] = background }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      fromDrawable(node.foreground)?.let { foreground -> props[ForegroundAttributeId] = foreground }
    }

    props[AlphaAttributeId] = InspectableValue.Number(node.alpha)
    props[StateAttributeId] =
        InspectableObject(
            mapOf(
                StateEnabledAttributeId to InspectableValue.Boolean(node.isEnabled),
                StateActivatedAttributeId to InspectableValue.Boolean(node.isActivated),
                StateFocusedAttributeId to InspectableValue.Boolean(node.isFocused),
                StateSelectedAttributeId to InspectableValue.Boolean(node.isSelected)))

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR1) {
      props[TextDirectionAttributeId] = TextDirectionMapping.toInspectable(node.textDirection)
      props[TextAlignmentAttributeId] = TextAlignmentMapping.toInspectable(node.textAlignment)
    }

    node.tag
        ?.let { InspectableValue.fromAny(it, mutable = false) }
        ?.let { tag -> props.put(TagAttributeId, tag) }

    props[KeyedTagsAttributeId] = InspectableObject(getViewTags(node))

    attributeSections[SectionId] = InspectableObject(props.toMap())
  }

  override fun onGetSnapshot(node: View, bitmap: Bitmap?): Bitmap? {
    if (node.width <= 0 || node.height <= 0) {
      return null
    }
    var workingBitmap = bitmap

    try {
      val differentSize =
          if (bitmap != null) (node.width != bitmap.width || node.height != bitmap.height)
          else false
      if (workingBitmap == null || differentSize) {
        val viewWidth: Int = node.width
        val viewHeight: Int = node.height

        workingBitmap = BitmapPool.createBitmapWithDefaultConfig(viewWidth, viewHeight)
      }

      val canvas = Canvas(workingBitmap)
      node.draw(canvas)
    } catch (e: OutOfMemoryError) {}

    return workingBitmap
  }

  private fun fromDrawable(d: Drawable?): Inspectable? {
    return if (d is ColorDrawable) {
      InspectableValue.Color(Color.fromColor(d.color))
    } else null
  }

  private fun getLayoutParams(node: View): InspectableObject {
    val layoutParams = node.layoutParams

    val params = mutableMapOf<Int, Inspectable>()
    params[WidthAttributeId] = LayoutParamsMapping.toInspectable(layoutParams.width)
    params[HeightAttributeId] = LayoutParamsMapping.toInspectable(layoutParams.height)

    if (layoutParams is ViewGroup.MarginLayoutParams) {
      params[MarginAttributeId] =
          InspectableValue.SpaceBox(
              SpaceBox(
                  layoutParams.topMargin,
                  layoutParams.rightMargin,
                  layoutParams.bottomMargin,
                  layoutParams.leftMargin))
    }
    if (layoutParams is FrameLayout.LayoutParams) {
      params[GravityAttributeId] = GravityMapping.toInspectable(layoutParams.gravity)
    }
    if (layoutParams is LinearLayout.LayoutParams) {
      params[WeightAttributeId] = InspectableValue.Number(layoutParams.weight)
      params[GravityAttributeId] = GravityMapping.toInspectable(layoutParams.gravity)
    }
    return InspectableObject(params)
  }

  private fun getViewTags(node: View): MutableMap<Int, Inspectable> {
    val tags = mutableMapOf<Int, Inspectable>()

    KeyedTagsField?.let { field ->
      val keyedTags = field.get(node) as SparseArray<*>?
      if (keyedTags != null) {
        var i = 0
        val count = keyedTags.size()
        while (i < count) {
          val id =
              ResourcesUtil.getIdStringQuietly(node.context, node.resources, keyedTags.keyAt(i))
          keyedTags
              .valueAt(i)
              ?.let { InspectableValue.fromAny(it, false) }
              ?.let {
                val metadata = MetadataRegister.get(NAMESPACE, id)
                val identifier =
                    metadata?.id
                        ?: MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, id)
                tags.put(identifier, it)
              }
          i++
        }
      }
    }

    return tags
  }

  private val LayoutParamsMapping: EnumMapping<Int> =
      object :
          EnumMapping<Int>(
              mapOf(
                  "WRAP_CONTENT" to ViewGroup.LayoutParams.WRAP_CONTENT,
                  "MATCH_PARENT" to ViewGroup.LayoutParams.MATCH_PARENT,
                  "FILL_PARENT" to ViewGroup.LayoutParams.FILL_PARENT,
              )) {}

  private val VisibilityMapping: EnumMapping<Int> =
      object :
          EnumMapping<Int>(
              mapOf(
                  "VISIBLE" to View.VISIBLE,
                  "INVISIBLE" to View.INVISIBLE,
                  "GONE" to View.GONE,
              )) {}

  private val LayoutDirectionMapping: EnumMapping<Int> =
      when {
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR1 -> {
          object :
              EnumMapping<Int>(
                  mapOf(
                      "LAYOUT_DIRECTION_INHERIT" to View.LAYOUT_DIRECTION_INHERIT,
                      "LAYOUT_DIRECTION_LOCALE" to View.LAYOUT_DIRECTION_LOCALE,
                      "LAYOUT_DIRECTION_LTR" to View.LAYOUT_DIRECTION_LTR,
                      "LAYOUT_DIRECTION_RTL" to View.LAYOUT_DIRECTION_RTL,
                  )) {}
        }
        else -> {
          object : EnumMapping<Int>(emptyMap()) {}
        }
      }

  private val TextDirectionMapping: EnumMapping<Int> =
      when {
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR1 -> {
          object :
              EnumMapping<Int>(
                  mapOf(
                      "TEXT_DIRECTION_INHERIT" to View.TEXT_DIRECTION_INHERIT,
                      "TEXT_DIRECTION_FIRST_STRONG" to View.TEXT_DIRECTION_FIRST_STRONG,
                      "TEXT_DIRECTION_ANY_RTL" to View.TEXT_DIRECTION_ANY_RTL,
                      "TEXT_DIRECTION_LTR" to View.TEXT_DIRECTION_LTR,
                      "TEXT_DIRECTION_RTL" to View.TEXT_DIRECTION_RTL,
                      "TEXT_DIRECTION_LOCALE" to View.TEXT_DIRECTION_LOCALE,
                  )) {}
        }
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.M -> {
          object :
              EnumMapping<Int>(
                  mapOf(
                      "TEXT_DIRECTION_INHERIT" to View.TEXT_DIRECTION_INHERIT,
                      "TEXT_DIRECTION_FIRST_STRONG" to View.TEXT_DIRECTION_FIRST_STRONG,
                      "TEXT_DIRECTION_ANY_RTL" to View.TEXT_DIRECTION_ANY_RTL,
                      "TEXT_DIRECTION_LTR" to View.TEXT_DIRECTION_LTR,
                      "TEXT_DIRECTION_RTL" to View.TEXT_DIRECTION_RTL,
                      "TEXT_DIRECTION_LOCALE" to View.TEXT_DIRECTION_LOCALE,
                      "TEXT_DIRECTION_FIRST_STRONG_LTR" to View.TEXT_DIRECTION_FIRST_STRONG_LTR,
                      "TEXT_DIRECTION_FIRST_STRONG_RTL" to View.TEXT_DIRECTION_FIRST_STRONG_RTL,
                  )) {}
        }
        else -> {
          object : EnumMapping<Int>(emptyMap()) {}
        }
      }

  private val TextAlignmentMapping: EnumMapping<Int> =
      when {
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR1 -> {
          object :
              EnumMapping<Int>(
                  mapOf(
                      "TEXT_ALIGNMENT_INHERIT" to View.TEXT_ALIGNMENT_INHERIT,
                      "TEXT_ALIGNMENT_GRAVITY" to View.TEXT_ALIGNMENT_GRAVITY,
                      "TEXT_ALIGNMENT_TEXT_START" to View.TEXT_ALIGNMENT_TEXT_START,
                      "TEXT_ALIGNMENT_TEXT_END" to View.TEXT_ALIGNMENT_TEXT_END,
                      "TEXT_ALIGNMENT_CENTER" to View.TEXT_ALIGNMENT_CENTER,
                      "TEXT_ALIGNMENT_VIEW_START" to View.TEXT_ALIGNMENT_VIEW_START,
                      "TEXT_ALIGNMENT_VIEW_END" to View.TEXT_ALIGNMENT_VIEW_END,
                  )) {}
        }
        else -> {
          object : EnumMapping<Int>(emptyMap()) {}
        }
      }

  private val GravityMapping =
      object :
          EnumMapping<Int>(
              mapOf(
                  "NONE" to -1,
                  "NO_GRAVITY" to Gravity.NO_GRAVITY,
                  "LEFT" to Gravity.LEFT,
                  "TOP" to Gravity.TOP,
                  "RIGHT" to Gravity.RIGHT,
                  "BOTTOM" to Gravity.BOTTOM,
                  "CENTER" to Gravity.CENTER,
                  "CENTER_VERTICAL" to Gravity.CENTER_VERTICAL,
                  "FILL_VERTICAL" to Gravity.FILL_VERTICAL,
                  "CENTER_HORIZONTAL" to Gravity.CENTER_HORIZONTAL,
                  "FILL_HORIZONTAL" to Gravity.FILL_HORIZONTAL,
              )) {}

  private var KeyedTagsField: Field? = null
  private var ListenerInfoField: Field? = null
  private var OnClickListenerField: Field? = null

  init {
    try {
      @SuppressLint("DiscouragedPrivateApi")
      KeyedTagsField = View::class.java.getDeclaredField("mKeyedTags")
      KeyedTagsField?.let { field -> field.isAccessible = true }
      @SuppressLint("DiscouragedPrivateApi")
      ListenerInfoField = View::class.java.getDeclaredField("mListenerInfo")
      ListenerInfoField?.let { field -> field.isAccessible = true }
      val viewInfoClassName = View::class.java.name + "\$ListenerInfo"
      OnClickListenerField = Class.forName(viewInfoClassName).getDeclaredField("mOnClickListener")
      OnClickListenerField?.let { field -> field.isAccessible = true }
    } catch (ignored: Exception) {}
  }
}
