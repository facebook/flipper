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
import android.view.ViewGroup.MarginLayoutParams
import android.widget.FrameLayout
import android.widget.LinearLayout
import com.facebook.flipper.plugins.uidebugger.common.EnumMapping
import com.facebook.flipper.plugins.uidebugger.common.InspectableValue
import com.facebook.flipper.plugins.uidebugger.stetho.ResourcesUtil
import java.lang.reflect.Field

class ViewDescriptor : AbstractChainedDescriptor<View>() {
  override fun init() {}

  override fun onGetId(view: View): String {
    return Integer.toBinaryString(System.identityHashCode(view))
  }

  override fun onGetName(view: View): String {
    return view.javaClass.simpleName
  }

  override fun onGetChildren(view: View, children: MutableList<Any>) {}

  override fun onGetData(view: View, builder: MutableMap<String, Any?>) {
    val positionOnScreen = IntArray(2)
    view.getLocationOnScreen(positionOnScreen)

    val props = mutableMapOf<String, Any?>()
    props.put("height", InspectableValue.mutable(view.height))
    props.put("width", InspectableValue.mutable(view.width))
    props.put("alpha", InspectableValue.mutable(view.alpha))
    props.put("visibility", VisibilityMapping.toPicker(view.visibility))
    props.put("background", fromDrawable(view.background))
    // props.put("tag", InspectableValue.mutable(view.tag))
    // props.put("keyedTags", getTags(view))
    props.put("layoutParams", getLayoutParams(view))
    props.put(
        "state",
        mapOf<String, Any?>(
            "enabled" to InspectableValue.mutable(view.isEnabled),
            "activated" to InspectableValue.mutable(view.isActivated),
            "focused" to view.isFocused,
            "selected" to InspectableValue.mutable(view.isSelected)))
    props.put(
        "bounds",
        mapOf<String, Any?>(
            "left" to InspectableValue.mutable(view.left),
            "right" to InspectableValue.mutable(view.right),
            "top" to InspectableValue.mutable(view.top),
            "bottom" to InspectableValue.mutable(view.bottom)))
    props.put(
        "padding",
        mapOf<String, Any?>(
            "left" to InspectableValue.mutable(view.paddingLeft),
            "top" to InspectableValue.mutable(view.paddingTop),
            "right" to InspectableValue.mutable(view.paddingRight),
            "bottom" to InspectableValue.mutable(view.paddingBottom)))
    props.put(
        "rotation",
        mapOf<String, Any?>(
            "x" to InspectableValue.mutable(view.rotationX),
            "y" to InspectableValue.mutable(view.rotationY),
            "z" to InspectableValue.mutable(view.rotation)))
    props.put(
        "scale",
        mapOf<String, Any?>(
            "x" to InspectableValue.mutable(view.scaleX),
            "y" to InspectableValue.mutable(view.scaleY)))
    props.put(
        "pivot",
        mapOf<String, Any?>(
            "x" to InspectableValue.mutable(view.pivotX),
            "y" to InspectableValue.mutable(view.pivotY)))
    props.put("positionOnScreenX", positionOnScreen[0])
    props.put("positionOnScreenY", positionOnScreen[1])

    builder.put("View", props)
  }

  fun fromDrawable(d: Drawable?): InspectableValue<*> {
    return if (d is ColorDrawable) {
      InspectableValue.mutable(InspectableValue.Type.Color, d.color)
    } else InspectableValue.mutable(InspectableValue.Type.Color, 0)
  }

  fun fromSize(size: Int): InspectableValue<*> {
    return when (size) {
      ViewGroup.LayoutParams.WRAP_CONTENT ->
          InspectableValue.mutable(InspectableValue.Type.Enum, "WRAP_CONTENT")
      ViewGroup.LayoutParams.MATCH_PARENT ->
          InspectableValue.mutable(InspectableValue.Type.Enum, "MATCH_PARENT")
      else -> InspectableValue.mutable(InspectableValue.Type.Enum, Integer.toString(size))
    }
  }

  fun getLayoutParams(node: View): MutableMap<String, Any> {
    val layoutParams = node.layoutParams

    val params = mutableMapOf<String, Any>()
    params.put("width", fromSize(layoutParams.width))
    params.put("height", fromSize(layoutParams.height))
    if (layoutParams is MarginLayoutParams) {
      val marginLayoutParams = layoutParams

      val margin =
          mapOf<String, Any>(
              "left" to InspectableValue.mutable(marginLayoutParams.leftMargin),
              "top" to InspectableValue.mutable(marginLayoutParams.topMargin),
              "right" to InspectableValue.mutable(marginLayoutParams.rightMargin),
              "bottom" to InspectableValue.mutable(marginLayoutParams.bottomMargin))

      params.put("margin", margin)
    }
    if (layoutParams is FrameLayout.LayoutParams) {
      params.put("gravity", GravityMapping.toPicker(layoutParams.gravity))
    }
    if (layoutParams is LinearLayout.LayoutParams) {
      val linearLayoutParams = layoutParams
      params.put("weight", InspectableValue.mutable(linearLayoutParams.weight))
      params.put("gravity", GravityMapping.toPicker(linearLayoutParams.gravity))
    }
    return params
  }

  fun getTags(node: View): MutableMap<String, Any?> {
    val tags = mutableMapOf<String, Any?>()

    KeyedTagsField?.let { field ->
      val keyedTags = field[node] as SparseArray<*>
      if (keyedTags != null) {
        var i = 0
        val count = keyedTags.size()
        while (i < count) {
          val id =
              ResourcesUtil.getIdStringQuietly(node.context, node.resources, keyedTags.keyAt(i))
          tags.put(id, keyedTags.valueAt(i))
          i++
        }
      }
    }

    return tags
  }

  private val VisibilityMapping: EnumMapping<Int> =
      object : EnumMapping<Int>("VISIBLE") {
        init {
          put("VISIBLE", View.VISIBLE)
          put("INVISIBLE", View.INVISIBLE)
          put("GONE", View.GONE)
        }
      }

  private val LayoutDirectionMapping: EnumMapping<Int> =
      object : EnumMapping<Int>("LAYOUT_DIRECTION_INHERIT") {
        init {
          put("LAYOUT_DIRECTION_INHERIT", View.LAYOUT_DIRECTION_INHERIT)
          put("LAYOUT_DIRECTION_LOCALE", View.LAYOUT_DIRECTION_LOCALE)
          put("LAYOUT_DIRECTION_LTR", View.LAYOUT_DIRECTION_LTR)
          put("LAYOUT_DIRECTION_RTL", View.LAYOUT_DIRECTION_RTL)
        }
      }

  private val TextDirectionMapping: EnumMapping<Int> =
      object : EnumMapping<Int>("TEXT_DIRECTION_INHERIT") {
        init {
          put("TEXT_DIRECTION_INHERIT", View.TEXT_DIRECTION_INHERIT)
          put("TEXT_DIRECTION_FIRST_STRONG", View.TEXT_DIRECTION_FIRST_STRONG)
          put("TEXT_DIRECTION_ANY_RTL", View.TEXT_DIRECTION_ANY_RTL)
          put("TEXT_DIRECTION_LTR", View.TEXT_DIRECTION_LTR)
          put("TEXT_DIRECTION_RTL", View.TEXT_DIRECTION_RTL)
          put("TEXT_DIRECTION_LOCALE", View.TEXT_DIRECTION_LOCALE)
          put("TEXT_DIRECTION_FIRST_STRONG_LTR", View.TEXT_DIRECTION_FIRST_STRONG_LTR)
          put("TEXT_DIRECTION_FIRST_STRONG_RTL", View.TEXT_DIRECTION_FIRST_STRONG_RTL)
        }
      }

  private val TextAlignmentMapping: EnumMapping<Int> =
      object : EnumMapping<Int>("TEXT_ALIGNMENT_INHERIT") {
        init {
          put("TEXT_ALIGNMENT_INHERIT", View.TEXT_ALIGNMENT_INHERIT)
          put("TEXT_ALIGNMENT_GRAVITY", View.TEXT_ALIGNMENT_GRAVITY)
          put("TEXT_ALIGNMENT_TEXT_START", View.TEXT_ALIGNMENT_TEXT_START)
          put("TEXT_ALIGNMENT_TEXT_END", View.TEXT_ALIGNMENT_TEXT_END)
          put("TEXT_ALIGNMENT_CENTER", View.TEXT_ALIGNMENT_CENTER)
          put("TEXT_ALIGNMENT_VIEW_START", View.TEXT_ALIGNMENT_VIEW_START)
          put("TEXT_ALIGNMENT_VIEW_END", View.TEXT_ALIGNMENT_VIEW_END)
        }
      }

  private val GravityMapping: EnumMapping<Int> =
      object : EnumMapping<Int>("NO_GRAVITY") {
        init {
          put("NO_GRAVITY", Gravity.NO_GRAVITY)
          put("LEFT", Gravity.LEFT)
          put("TOP", Gravity.TOP)
          put("RIGHT", Gravity.RIGHT)
          put("BOTTOM", Gravity.BOTTOM)
          put("CENTER", Gravity.CENTER)
          put("CENTER_VERTICAL", Gravity.CENTER_VERTICAL)
          put("FILL_VERTICAL", Gravity.FILL_VERTICAL)
          put("CENTER_HORIZONTAL", Gravity.CENTER_HORIZONTAL)
          put("FILL_HORIZONTAL", Gravity.FILL_HORIZONTAL)
        }
      }

  companion object {
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
}
