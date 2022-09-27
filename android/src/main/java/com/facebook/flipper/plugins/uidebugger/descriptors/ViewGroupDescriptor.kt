/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

import android.graphics.Bitmap
import android.graphics.Canvas
import android.os.Build
import android.view.View
import android.view.ViewGroup
import androidx.core.view.ViewGroupCompat
import com.facebook.flipper.plugins.uidebugger.common.*
import com.facebook.flipper.plugins.uidebugger.core.FragmentTracker

object ViewGroupDescriptor : ChainedDescriptor<ViewGroup>() {

  override fun onGetName(node: ViewGroup): String {
    return node.javaClass.simpleName
  }

  override fun onGetChildren(node: ViewGroup, children: MutableList<Any>) {
    val count = node.childCount - 1
    for (i in 0..count) {
      val child: View = node.getChildAt(i)
      val fragment = FragmentTracker.getFragment(child)
      if (fragment != null) {
        children.add(fragment)
      } else children.add(child)
    }
  }

  override fun onGetData(
      node: ViewGroup,
      attributeSections: MutableMap<SectionName, InspectableObject>
  ) {
    val viewGroupAttrs = mutableMapOf<String, Inspectable>()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR2) {
      viewGroupAttrs["LayoutMode"] = LayoutModeMapping.toInspectable(node.layoutMode, true)
      viewGroupAttrs["ClipChildren"] = InspectableValue.Boolean(node.clipChildren, true)
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      viewGroupAttrs["ClipToPadding"] = InspectableValue.Boolean(node.clipToPadding, true)
    }

    attributeSections["ViewGroup"] = InspectableObject(viewGroupAttrs)
  }

  override fun onGetSnapshot(node: ViewGroup, bitmap: Bitmap?): Bitmap? {
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

  private val LayoutModeMapping: EnumMapping<Int> =
      object :
          EnumMapping<Int>(
              mapOf(
                  "LAYOUT_MODE_CLIP_BOUNDS" to ViewGroupCompat.LAYOUT_MODE_CLIP_BOUNDS,
                  "LAYOUT_MODE_OPTICAL_BOUNDS" to ViewGroupCompat.LAYOUT_MODE_OPTICAL_BOUNDS,
              )) {}
}
