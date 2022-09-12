/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

import android.app.Fragment
import android.os.Build
import android.view.View
import android.view.ViewGroup
import androidx.core.view.ViewGroupCompat
import com.facebook.flipper.plugins.uidebugger.common.EnumMapping
import com.facebook.flipper.plugins.uidebugger.common.Inspectable
import com.facebook.flipper.plugins.uidebugger.common.InspectableObject
import com.facebook.flipper.plugins.uidebugger.common.InspectableValue
import com.facebook.flipper.plugins.uidebugger.stetho.FragmentCompat

object ViewGroupDescriptor : AbstractChainedDescriptor<ViewGroup>() {

  override fun onGetId(node: ViewGroup): String {
    return System.identityHashCode(node).toString()
  }

  override fun onGetName(node: ViewGroup): String {
    return node.javaClass.simpleName
  }

  override fun onGetChildren(node: ViewGroup, children: MutableList<Any>) {
    val count = node.childCount - 1
    for (i in 0..count) {
      val child: View = node.getChildAt(i)
      val fragment = getAttachedFragmentForView(child)
      if (fragment != null && !FragmentCompat.isDialogFragment(fragment)) {
        children.add(fragment)
      } else children.add(child)
    }
  }

  override fun onGetData(
      node: ViewGroup,
      attributeSections: MutableMap<String, InspectableObject>
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

  private val LayoutModeMapping: EnumMapping<Int> =
      object :
          EnumMapping<Int>(
              mapOf(
                  "LAYOUT_MODE_CLIP_BOUNDS" to ViewGroupCompat.LAYOUT_MODE_CLIP_BOUNDS,
                  "LAYOUT_MODE_OPTICAL_BOUNDS" to ViewGroupCompat.LAYOUT_MODE_OPTICAL_BOUNDS,
              )) {}

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
