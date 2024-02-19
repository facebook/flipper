/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

import android.annotation.SuppressLint
import android.graphics.Rect
import android.graphics.drawable.ColorDrawable
import android.graphics.drawable.Drawable
import android.os.Build
import android.util.SparseArray
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.ViewGroup.MarginLayoutParams
import android.widget.FrameLayout
import android.widget.LinearLayout
import androidx.viewpager.widget.ViewPager
import com.facebook.flipper.core.FlipperDynamic
import com.facebook.flipper.plugins.uidebugger.model.*
import com.facebook.flipper.plugins.uidebugger.util.ColorUtil.toColorInt
import com.facebook.flipper.plugins.uidebugger.util.EnumMapping
import com.facebook.flipper.plugins.uidebugger.util.ResourcesUtil
import java.lang.reflect.Field
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonPrimitive

object ViewDescriptor : ChainedDescriptor<View>() {

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

  private const val NAMESPACE = "View"

  private var SectionId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, NAMESPACE)

  private val PositionAttributeId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "position", mutable = true)
  private val GlobalPositionAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "globalPosition")
  private val SizeAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "size", mutable = true)
  private val BoundsAttributeId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "bounds", mutable = true)

  private val PaddingAttributeId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "padding", mutable = true)
  private val LocalVisibleRectAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "localVisibleRect")
  private val RotationAttributeId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "rotation", mutable = true)
  private val ScaleAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "scale", mutable = true)
  private val PivotAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "pivot", mutable = true)
  private val ScrollAttributeId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "scroll", mutable = true)
  private val LayoutParamsAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "layoutParams")
  private val LayoutDirectionAttributeId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE,
          NAMESPACE,
          "layoutDirection",
          mutable = false, // for some reason this doesnt work
          LayoutDirectionMapping.getInspectableValues())
  private val TranslationAttributeId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "translation", mutable = true)
  private val ElevationAttributeId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "elevation", mutable = true)
  private val VisibilityAttributeId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE,
          NAMESPACE,
          "visibility",
          true,
          VisibilityMapping.getInspectableValues())

  private val BackgroundAttributeId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "background", mutable = true)
  private val ForegroundAttributeId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "foreground", mutable = true)

  private val AlphaAttributeId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE,
          NAMESPACE,
          "alpha",
          mutable = true,
          minValue = 0,
          maxValue = 1)

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
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE,
          NAMESPACE,
          "textDirection",
          mutable = false, // for some reason this doesnt work
          TextDirectionMapping.getInspectableValues())
  private val TextAlignmentAttributeId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE,
          NAMESPACE,
          "textAlignment",
          mutable = false, // for some reason this doesnt work
          TextAlignmentMapping.getInspectableValues())

  private val TagAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "tag")
  private val KeyedTagsAttributeId =
      MetadataRegister.register(MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "keyedTags")

  private val WidthAttributeId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE,
          NAMESPACE,
          "width",
          true,
          LayoutParamsMapping.getInspectableValues(),
          minValue = 0)
  private val HeightAttributeId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE,
          NAMESPACE,
          "height",
          true,
          LayoutParamsMapping.getInspectableValues(),
          minValue = 0)

  private val MarginAttributeId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "margin", mutable = true)
  private val WeightAttributeId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE, NAMESPACE, "weight", mutable = true)
  private val GravityAttributeId =
      MetadataRegister.register(
          MetadataRegister.TYPE_ATTRIBUTE,
          NAMESPACE,
          "gravity",
          true,
          GravityMapping.getInspectableValues())

  override fun onGetName(node: View): String = node.javaClass.simpleName

  override fun onGetBounds(node: View): Bounds {

    val parent = node.parent
    if (parent is ViewPager) {
      // override
      return Bounds(0, 0, node.width, node.height)
    }

    var xScrollOffset = 0
    var yScrollOffset = 0

    if (parent is View) {
      // NestedScrollView, HorizontalScrollView and ScrollView all set scroll x and y
      // we need to account for this in the childs bounds
      xScrollOffset = parent.scrollX
      yScrollOffset = parent.scrollY
    }

    return Bounds(
        node.left + node.translationX.toInt() - xScrollOffset,
        node.top + node.translationY.toInt() - yScrollOffset,
        node.width,
        node.height)
  }

  override fun onGetTags(node: View): Set<String> = BaseTags.NativeAndroid

  override fun onGetAttributes(
      node: View,
      attributeSections: MutableMap<MetadataId, InspectableObject>
  ) {

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
        InspectableValue.SpaceBox(SpaceBox(node.top, node.right, node.bottom, node.left))

    props[PaddingAttributeId] =
        InspectableValue.SpaceBox(
            SpaceBox(node.paddingTop, node.paddingRight, node.paddingBottom, node.paddingLeft))

    props[LocalVisibleRectAttributeId] =
        InspectableValue.SpaceBox(
            SpaceBox(localVisible.top, localVisible.right, localVisible.bottom, localVisible.left))

    props[RotationAttributeId] =
        InspectableValue.Coordinate3D(Coordinate3D(node.rotationX, node.rotationY, node.rotation))
    props[ScaleAttributeId] = InspectableValue.Coordinate(Coordinate(node.scaleX, node.scaleY))
    props[PivotAttributeId] = InspectableValue.Coordinate(Coordinate(node.pivotX, node.pivotY))

    props[ScrollAttributeId] = InspectableValue.Coordinate(Coordinate(node.scrollX, node.scrollY))

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

  @SuppressLint("NewApi")
  override fun onEditAttribute(
      node: View,
      metadataPath: List<Metadata>,
      value: FlipperDynamic,
      hint: CompoundTypeHint?
  ) {
    if (metadataPath.first().id != SectionId) {
      return
    }

    when (metadataPath.last().id) {
      AlphaAttributeId -> node.alpha = value.asFloat()
      BoundsAttributeId ->
          when (hint) {
            CompoundTypeHint.LEFT -> node.left = value.asInt()
            CompoundTypeHint.RIGHT -> node.right = value.asInt()
            CompoundTypeHint.TOP -> node.top = value.asInt()
            CompoundTypeHint.BOTTOM -> node.bottom = value.asInt()
            else -> {}
          }
      ElevationAttributeId -> node.elevation = value.asFloat()
      GravityAttributeId -> {
        val layoutParams = node.layoutParams
        if (layoutParams is LinearLayout.LayoutParams) {
          layoutParams.gravity = GravityMapping.getEnumValue(value.asString() ?: "Unknown")
        }
        if (layoutParams is FrameLayout.LayoutParams) {
          layoutParams.gravity = GravityMapping.getEnumValue(value.asString() ?: "Unknown")
        }
        node.layoutParams = layoutParams
      }
      ForegroundAttributeId -> node.foreground = ColorDrawable(toColorInt(value))
      BackgroundAttributeId -> node.background = ColorDrawable(toColorInt(value))
      HeightAttributeId -> {
        val strValue = value.asRaw()
        val layoutParams = node.layoutParams
        if (strValue is String) {
          layoutParams.height = LayoutParamsMapping.getEnumValue(strValue)
        } else {
          layoutParams.height = value.asInt()
        }
        node.layoutParams = layoutParams
      }
      WidthAttributeId -> {
        val strValue = value.asRaw()
        val layoutParams = node.layoutParams
        if (strValue is String) {
          layoutParams.width = LayoutParamsMapping.getEnumValue(strValue)
        } else {
          layoutParams.width = value.asInt()
        }
        node.layoutParams = layoutParams
      }
      MarginAttributeId -> {
        val layoutParams = node.layoutParams
        if (layoutParams is MarginLayoutParams) {
          layoutParams.setMargins(
              if (hint == CompoundTypeHint.LEFT) value.asInt() else layoutParams.leftMargin,
              if (hint == CompoundTypeHint.TOP) value.asInt() else layoutParams.topMargin,
              if (hint == CompoundTypeHint.RIGHT) value.asInt() else layoutParams.rightMargin,
              if (hint == CompoundTypeHint.BOTTOM) value.asInt() else layoutParams.bottomMargin,
          )
          node.layoutParams = layoutParams
        }
      }
      PaddingAttributeId ->
          node.setPadding(
              if (hint == CompoundTypeHint.LEFT) value.asInt() else node.paddingLeft,
              if (hint == CompoundTypeHint.TOP) value.asInt() else node.paddingTop,
              if (hint == CompoundTypeHint.RIGHT) value.asInt() else node.paddingRight,
              if (hint == CompoundTypeHint.BOTTOM) value.asInt() else node.paddingBottom,
          )
      PivotAttributeId ->
          when (hint) {
            CompoundTypeHint.X -> node.pivotX = value.asFloat()
            CompoundTypeHint.Y -> node.pivotY = value.asFloat()
            else -> {}
          }
      PositionAttributeId ->
          when (hint) {
            CompoundTypeHint.X -> node.x = value.asFloat()
            CompoundTypeHint.Y -> node.y = value.asFloat()
            CompoundTypeHint.Z -> node.z = value.asFloat()
            else -> {}
          }
      RotationAttributeId ->
          when (hint) {
            CompoundTypeHint.X -> node.rotationX = value.asFloat()
            CompoundTypeHint.Y -> node.rotationY = value.asFloat()
            CompoundTypeHint.Z -> node.rotation = value.asFloat()
            else -> {}
          }
      ScaleAttributeId ->
          when (hint) {
            CompoundTypeHint.X -> node.scaleX = value.asFloat()
            CompoundTypeHint.Y -> node.scaleY = value.asFloat()
            else -> {}
          }
      SizeAttributeId ->
          when (hint) {
            CompoundTypeHint.WIDTH -> {
              val layoutParams = node.layoutParams
              layoutParams.width = value.asInt()
              node.layoutParams = layoutParams
            }
            CompoundTypeHint.HEIGHT -> {
              val layoutParams = node.layoutParams
              layoutParams.height = value.asInt()
              node.layoutParams = layoutParams
            }
            else -> {}
          }
      ScrollAttributeId ->
          when (hint) {
            CompoundTypeHint.X -> node.scrollX = value.asInt()
            CompoundTypeHint.Y -> node.scrollY = value.asInt()
            else -> {}
          }
      TranslationAttributeId ->
          when (hint) {
            CompoundTypeHint.X -> node.translationX = value.asFloat()
            CompoundTypeHint.Y -> node.translationY = value.asFloat()
            CompoundTypeHint.Z -> node.translationZ = value.asFloat()
            else -> {}
          }
      VisibilityAttributeId ->
          node.visibility = VisibilityMapping.getEnumValue(value.asString() ?: "UnknownValue")
      WeightAttributeId -> {
        val layoutParams = node.layoutParams
        if (layoutParams is LinearLayout.LayoutParams) {
          layoutParams.weight = value.asFloat()
          node.layoutParams = layoutParams
        }
      }
    }
  }

  private val emptyBox = listOf(0f, 0f, 0f, 0f)

  override fun onGetBoxData(node: View): BoxData {

    val layoutParams = node.layoutParams
    val margin =
        if (layoutParams is ViewGroup.MarginLayoutParams) {
          listOf(
              layoutParams.topMargin.toFloat(),
              layoutParams.rightMargin.toFloat(),
              layoutParams.bottomMargin.toFloat(),
              layoutParams.leftMargin.toFloat())
        } else {
          emptyBox
        }

    val padding =
        listOf<Float>(
            node.paddingLeft.toFloat(),
            node.paddingRight.toFloat(),
            node.paddingTop.toFloat(),
            node.paddingBottom.toFloat(),
        )

    return BoxData(margin, emptyBox, padding)
  }

  override fun onGetInlineAttributes(node: View, attributes: MutableMap<String, String>) {
    val id = node.id
    if (id == View.NO_ID) {
      return
    }

    val value = ResourcesUtil.getIdStringQuietly(node.getContext(), node.getResources(), id)
    attributes["id"] = value
  }

  private fun fromDrawable(d: Drawable?): Inspectable? {
    return if (d is ColorDrawable) {
      InspectableValue.Color(Color.fromColor(d.color))
    } else {
      InspectableValue.Text(d.toString())
    }
  }

  private fun getLayoutParams(node: View): InspectableObject {
    val layoutParams = node.layoutParams

    val params = mutableMapOf<Int, Inspectable>()
    if (layoutParams.width >= 0) {
      params[WidthAttributeId] = InspectableValue.Number(layoutParams.width)
    } else {
      params[WidthAttributeId] = LayoutParamsMapping.toInspectable(layoutParams.width)
    }
    if (layoutParams.height >= 0) {
      params[WidthAttributeId] = InspectableValue.Number(layoutParams.height)
    } else {
      params[HeightAttributeId] = LayoutParamsMapping.toInspectable(layoutParams.height)
    }

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

  override fun onGetHiddenAttributes(node: View, attributes: MutableMap<String, JsonElement>) {

    if (node.visibility != View.VISIBLE) {
      attributes["invisible"] = JsonPrimitive(true)
    }
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
