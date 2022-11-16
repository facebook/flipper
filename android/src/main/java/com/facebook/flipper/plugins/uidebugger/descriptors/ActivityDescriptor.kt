/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

import android.app.Activity
import com.facebook.flipper.plugins.uidebugger.core.FragmentTracker
import com.facebook.flipper.plugins.uidebugger.model.Bounds
import com.facebook.flipper.plugins.uidebugger.util.DisplayMetrics

object ActivityDescriptor : ChainedDescriptor<Activity>() {

  override fun onGetBounds(node: Activity): Bounds = DisplayMetrics.getDisplayBounds()

  override fun onGetName(node: Activity): String {
    return node.javaClass.simpleName
  }

  override fun onGetChildren(node: Activity): List<Any> {
    val children = mutableListOf<Any>()

    node.window?.let { window -> children.add(window) }

    val fragments = FragmentTracker.getDialogFragments(node)
    fragments.forEach { fragment -> children.add(fragment) }

    return children
  }
}
