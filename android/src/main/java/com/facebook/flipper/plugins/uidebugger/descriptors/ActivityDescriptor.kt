/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

import android.app.Activity
import com.facebook.flipper.plugins.uidebugger.common.InspectableObject
import com.facebook.flipper.plugins.uidebugger.stetho.FragmentCompat

object ActivityDescriptor : ChainedDescriptor<Activity>() {

  override fun onGetId(node: Activity): String {
    return System.identityHashCode(node).toString()
  }

  override fun onGetName(node: Activity): String {
    return node.javaClass.simpleName
  }

  override fun onGetChildren(node: Activity, children: MutableList<Any>) {
    node.window?.let { window -> children.add(window) }

    var fragments = getDialogFragments(FragmentCompat.supportInstance, node)
    for (fragment in fragments) {
      children.add(fragment)
    }

    fragments = getDialogFragments(FragmentCompat.frameworkInstance, node)
    for (fragment in fragments) {
      children.add(fragment)
    }
  }

  override fun onGetData(
      node: Activity,
      attributeSections: MutableMap<String, InspectableObject>
  ) {}

  private fun getDialogFragments(
      compat: FragmentCompat<*, *, *, *>?,
      activity: Activity
  ): List<Any> {
    if (compat == null) {
      return emptyList()
    }

    return compat.getDialogFragments(activity)
  }
}
