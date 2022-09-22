/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

import android.app.Activity
import com.facebook.flipper.plugins.uidebugger.common.InspectableObject
import com.facebook.flipper.plugins.uidebugger.core.FragmentTracker

object ActivityDescriptor : ChainedDescriptor<Activity>() {

  override fun onGetName(node: Activity): String {
    return node.javaClass.simpleName
  }

  override fun onGetChildren(node: Activity, children: MutableList<Any>) {
    node.window?.let { window -> children.add(window) }

    val fragments = FragmentTracker.getDialogFragments(node)
    fragments.forEach { fragment -> children.add(fragment) }
  }

  override fun onGetData(
      node: Activity,
      attributeSections: MutableMap<String, InspectableObject>
  ) {}
}
