/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

import android.graphics.drawable.ColorDrawable
import android.graphics.drawable.Drawable
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
import com.facebook.flipper.plugins.uidebugger.stetho.ResourcesUtil
import java.lang.reflect.Field

object ViewDescriptor : AbstractChainedDescriptor<View>() {

  override fun onGetId(view: View): String {
    return Integer.toBinaryString(System.identityHashCode(view))
  }

  override fun onGetName(view: View): String {
    return view.javaClass.simpleName
  }

  override fun onGetData(view: View, attributeSections: MutableMap<String, InspectableObject>) {
    val positionOnScreen = IntArray(2)
    view.getLocationOnScreen(positionOnScreen)

    val props = mutableMapOf<String, Inspectable>()
    props.put("height", InspectableValue.Number(view.height, mutable = true))
    props.put("width", InspectableValue.Number(view.width, mutable = true))
    props.put("alpha", InspectableValue.Number(view.alpha, mutable = true))
    props.put("visibility", VisibilityMapping.toInspectable(view.visibility, mutable = false))

    fromDrawable(view.background)?.let { props.put("background", it) }

    view.tag?.let { InspectableValue.fromAny(it, mutable = false) }?.let { props.put("tag", it) }
    props.put("keyedTags", InspectableObject(getTags(view)))
    props.put("layoutParams", getLayoutParams(view))
    props.put(
        "state",
        InspectableObject(
            mapOf(
                "enabled" to InspectableValue.Boolean(view.isEnabled, mutable = false),
                "activated" to InspectableValue.Boolean(view.isActivated, mutable = false),
                "focused" to InspectableValue.Boolean(view.isFocused, mutable = false),
                "selected" to InspectableValue.Boolean(view.isSelected, mutable = false))))

    props.put(
        "bounds",
        InspectableObject(
            mapOf<String, Inspectable>(
                "left" to InspectableValue.Number(view.left, mutable = true),
                "right" to InspectableValue.Number(view.right, mutable = true),
                "top" to InspectableValue.Number(view.top, mutable = true),
                "bottom" to InspectableValue.Number(view.bottom, mutable = true))))
    props.put(
        "padding",
        InspectableObject(
            mapOf<String, Inspectable>(
                "left" to InspectableValue.Number(view.paddingLeft, mutable = true),
                "right" to InspectableValue.Number(view.paddingRight, mutable = true),
                "top" to InspectableValue.Number(view.paddingTop, mutable = true),
                "bottom" to InspectableValue.Number(view.paddingBottom, mutable = true))))

    props.put(
        "rotation",
        InspectableObject(
            mapOf<String, Inspectable>(
                "x" to InspectableValue.Number(view.rotationX, mutable = true),
                "y" to InspectableValue.Number(view.rotationY, mutable = true),
                "z" to InspectableValue.Number(view.rotation, mutable = true))))

    props.put(
        "scale",
        InspectableObject(
            mapOf(
                "x" to InspectableValue.Number(view.scaleX, mutable = true),
                "y" to InspectableValue.Number(view.scaleY, mutable = true))))
    props.put(
        "pivot",
        InspectableObject(
            mapOf(
                "x" to InspectableValue.Number(view.pivotX, mutable = true),
                "y" to InspectableValue.Number(view.pivotY, mutable = true))))

    props.put(
        "globalPosition",
        InspectableObject(
            mapOf(
                "x" to InspectableValue.Number(positionOnScreen[0], mutable = false),
                "y" to InspectableValue.Number(positionOnScreen[1], mutable = false))))

    attributeSections.put("View", InspectableObject(props.toMap()))
  }

  fun fromDrawable(d: Drawable?): Inspectable? {
    return if (d is ColorDrawable) {
      InspectableValue.Color(d.color, mutable = false)
    } else null
  }

  fun getLayoutParams(node: View): InspectableObject {
    val layoutParams = node.layoutParams

    val params = mutableMapOf<String, Inspectable>()
    params.put("width", LayoutParamsMapping.toInspectable(layoutParams.width, mutable = true))
    params.put("height", LayoutParamsMapping.toInspectable(layoutParams.height, mutable = true))

    if (layoutParams is ViewGroup.MarginLayoutParams) {
      val marginLayoutParams = layoutParams

      val margin =
          InspectableObject(
              mapOf<String, Inspectable>(
                  "left" to InspectableValue.Number(marginLayoutParams.leftMargin, mutable = true),
                  "top" to InspectableValue.Number(marginLayoutParams.topMargin, mutable = true),
                  "right" to
                      InspectableValue.Number(marginLayoutParams.rightMargin, mutable = true),
                  "bottom" to
                      InspectableValue.Number(marginLayoutParams.bottomMargin, mutable = true)))

      params.put("margin", margin)
    }
    if (layoutParams is FrameLayout.LayoutParams) {
      params.put("gravity", GravityMapping.toInspectable(layoutParams.gravity, mutable = true))
    }
    if (layoutParams is LinearLayout.LayoutParams) {
      val linearLayoutParams = layoutParams
      params.put("weight", InspectableValue.Number(linearLayoutParams.weight, mutable = true))
      params.put(
          "gravity", GravityMapping.toInspectable(linearLayoutParams.gravity, mutable = true))
    }
    return InspectableObject(params)
  }

  fun getTags(node: View): MutableMap<String, Inspectable> {
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
      object :
          EnumMapping<Int>(
              mapOf(
                  "LAYOUT_DIRECTION_INHERIT" to View.LAYOUT_DIRECTION_INHERIT,
                  "LAYOUT_DIRECTION_LOCALE" to View.LAYOUT_DIRECTION_LOCALE,
                  "LAYOUT_DIRECTION_LTR" to View.LAYOUT_DIRECTION_LTR,
                  "LAYOUT_DIRECTION_RTL" to View.LAYOUT_DIRECTION_RTL,
              )) {}

  private val TextDirectionMapping: EnumMapping<Int> =
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

  private val TextAlignmentMapping: EnumMapping<Int> =
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
      KeyedTagsField = View::class.java.getDeclaredField("mKeyedTags")
      KeyedTagsField?.let { field -> field.isAccessible = true }
      ListenerInfoField = View::class.java.getDeclaredField("mListenerInfo")
      ListenerInfoField?.let { field -> field.isAccessible = true }
      val viewInfoClassName = View::class.java.name + "\$ListenerInfo"
      OnClickListenerField = Class.forName(viewInfoClassName).getDeclaredField("mOnClickListener")
      OnClickListenerField?.let { field -> field.isAccessible = true }
    } catch (ignored: Exception) {}
  }
}
