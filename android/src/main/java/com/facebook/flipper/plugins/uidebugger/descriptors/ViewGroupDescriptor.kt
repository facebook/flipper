/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

import android.app.Fragment
import android.os.Build
import android.util.Log
import android.view.View
import android.view.ViewGroup
import androidx.core.view.ViewGroupCompat
import com.facebook.flipper.plugins.uidebugger.common.InspectableValue
import com.facebook.flipper.plugins.uidebugger.stetho.FragmentCompat

class ViewGroupDescriptor : AbstractChainedDescriptor<ViewGroup>() {
  override fun init() {}

  override fun onGetId(viewGroup: ViewGroup): String {
    return Integer.toString(System.identityHashCode(viewGroup))
  }

  override fun onGetName(viewGroup: ViewGroup): String {
    return viewGroup.javaClass.simpleName
  }

  override fun onGetChildren(viewGroup: ViewGroup, children: MutableList<Any>) {
    val count = viewGroup.childCount - 1
    for (i in 0..count) {
      val child: View = viewGroup.getChildAt(i)
      val fragment = getAttachedFragmentForView(child)
      if (fragment != null && !FragmentCompat.isDialogFragment(fragment)) {
        children.add(fragment)
      } else children.add(child)
    }
  }

  override fun onGetData(viewGroup: ViewGroup, builder: MutableMap<String, Any?>) {
    Log.d("FLIPPER_LAYOUT", "[viewgroup] onGetData")
    val groupBuilder = mutableMapOf<String, Any?>()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR2) {
      groupBuilder.put(
          "LayoutMode",
          InspectableValue.mutable(
              InspectableValue.Type.Enum,
              if (viewGroup.getLayoutMode() == ViewGroupCompat.LAYOUT_MODE_CLIP_BOUNDS)
                  "LAYOUT_MODE_CLIP_BOUNDS"
              else "LAYOUT_MODE_OPTICAL_BOUNDS"))
      groupBuilder.put(
          "ClipChildren",
          InspectableValue.mutable(InspectableValue.Type.Boolean, viewGroup.getClipChildren()))
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      groupBuilder.put(
          "ClipToPadding",
          InspectableValue.mutable(InspectableValue.Type.Boolean, viewGroup.getClipToPadding()))
    }

    builder.put("ViewGroup", groupBuilder)
  }

  companion object {
    private fun getAttachedFragmentForView(v: View): Any? {
      return try {
        val fragment = FragmentCompat.findFragmentForView(v)
        var added = false
        if (fragment is Fragment) {
          added = fragment.isAdded
        } else if (fragment is androidx.fragment.app.Fragment) {
          added = fragment.isAdded
        }
        if (added) fragment else null
      } catch (e: RuntimeException) {
        null
      }
    }
  }
}
