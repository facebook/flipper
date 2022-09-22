/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

import android.annotation.SuppressLint
import android.graphics.drawable.ColorDrawable
import android.graphics.drawable.Drawable
import android.os.Build
import android.util.SparseArray
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.LinearLayout
import com.facebook.flipper.plugins.uidebugger.common.EnumMapping
import com.facebook.flipper.plugins.uidebugger.common.Inspectable
import com.facebook.flipper.plugins.uidebugger.common.InspectableObject
import com.facebook.flipper.plugins.uidebugger.common.InspectableValue
import com.facebook.flipper.plugins.uidebugger.model.Bounds
import com.facebook.flipper.plugins.uidebugger.util.ResourcesUtil
import java.lang.reflect.Field

object ViewDescriptor : ChainedDescriptor<View>() {

  override fun onGetName(node: View): String {
    return node.javaClass.simpleName
  }

  override fun onGetBounds(node: View): Bounds {
    return Bounds(node.left, node.top, node.width, node.height)
  }

  override fun onGetTags(node: View): Set<String> = setOf(BaseTags.Native, BaseTags.Android)

  override fun onGetData(
      node: View,
      attributeSections: MutableMap<SectionName, InspectableObject>
  ) {
    val positionOnScreen = IntArray(2)
    node.getLocationOnScreen(positionOnScreen)

    val props = mutableMapOf<String, Inspectable>()
    props["height"] = InspectableValue.Number(node.height, mutable = true)
    props["width"] = InspectableValue.Number(node.width, mutable = true)
    props["alpha"] = InspectableValue.Number(node.alpha, mutable = true)
    props["visibility"] = VisibilityMapping.toInspectable(node.visibility, mutable = false)

    fromDrawable(node.background)?.let { props["background"] = it }

    node.tag?.let { InspectableValue.fromAny(it, mutable = false) }?.let { props.put("tag", it) }
    props["keyedTags"] = InspectableObject(getViewTags(node))
    props["layoutParams"] = getLayoutParams(node)
    props["state"] =
        InspectableObject(
            mapOf(
                "enabled" to InspectableValue.Boolean(node.isEnabled, mutable = false),
                "activated" to InspectableValue.Boolean(node.isActivated, mutable = false),
                "focused" to InspectableValue.Boolean(node.isFocused, mutable = false),
                "selected" to InspectableValue.Boolean(node.isSelected, mutable = false)))

    props["bounds"] =
        InspectableObject(
            mapOf<String, Inspectable>(
                "left" to InspectableValue.Number(node.left, mutable = true),
                "right" to InspectableValue.Number(node.right, mutable = true),
                "top" to InspectableValue.Number(node.top, mutable = true),
                "bottom" to InspectableValue.Number(node.bottom, mutable = true)))
    props["padding"] =
        InspectableObject(
            mapOf<String, Inspectable>(
                "left" to InspectableValue.Number(node.paddingLeft, mutable = true),
                "right" to InspectableValue.Number(node.paddingRight, mutable = true),
                "top" to InspectableValue.Number(node.paddingTop, mutable = true),
                "bottom" to InspectableValue.Number(node.paddingBottom, mutable = true)))

    props["rotation"] =
        InspectableObject(
            mapOf<String, Inspectable>(
                "x" to InspectableValue.Number(node.rotationX, mutable = true),
                "y" to InspectableValue.Number(node.rotationY, mutable = true),
                "z" to InspectableValue.Number(node.rotation, mutable = true)))

    props["scale"] =
        InspectableObject(
            mapOf(
                "x" to InspectableValue.Number(node.scaleX, mutable = true),
                "y" to InspectableValue.Number(node.scaleY, mutable = true)))
    props["pivot"] =
        InspectableObject(
            mapOf(
                "x" to InspectableValue.Number(node.pivotX, mutable = true),
                "y" to InspectableValue.Number(node.pivotY, mutable = true)))

    props["globalPosition"] =
        InspectableObject(
            mapOf(
                "x" to InspectableValue.Number(positionOnScreen[0], mutable = false),
                "y" to InspectableValue.Number(positionOnScreen[1], mutable = false)))

    attributeSections["View"] = InspectableObject(props.toMap())
  }

  private fun fromDrawable(d: Drawable?): Inspectable? {
    return if (d is ColorDrawable) {
      InspectableValue.Color(d.color, mutable = false)
    } else null
  }

  private fun getLayoutParams(node: View): InspectableObject {
    val layoutParams = node.layoutParams

    val params = mutableMapOf<String, Inspectable>()
    params["width"] = LayoutParamsMapping.toInspectable(layoutParams.width, mutable = true)
    params["height"] = LayoutParamsMapping.toInspectable(layoutParams.height, mutable = true)

    if (layoutParams is ViewGroup.MarginLayoutParams) {
      val margin =
          InspectableObject(
              mapOf<String, Inspectable>(
                  "left" to InspectableValue.Number(layoutParams.leftMargin, mutable = true),
                  "top" to InspectableValue.Number(layoutParams.topMargin, mutable = true),
                  "right" to InspectableValue.Number(layoutParams.rightMargin, mutable = true),
                  "bottom" to InspectableValue.Number(layoutParams.bottomMargin, mutable = true)))

      params["margin"] = margin
    }
    if (layoutParams is FrameLayout.LayoutParams) {
      params["gravity"] = GravityMapping.toInspectable(layoutParams.gravity, mutable = true)
    }
    if (layoutParams is LinearLayout.LayoutParams) {
      params["weight"] = InspectableValue.Number(layoutParams.weight, mutable = true)
      params["gravity"] = GravityMapping.toInspectable(layoutParams.gravity, mutable = true)
    }
    return InspectableObject(params)
  }

  private fun getViewTags(node: View): MutableMap<String, Inspectable> {
    val tags = mutableMapOf<String, Inspectable>()

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
              ?.let { tags.put(id, it) }
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
