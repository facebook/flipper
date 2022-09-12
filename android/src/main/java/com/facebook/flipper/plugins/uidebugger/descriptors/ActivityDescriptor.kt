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

object ActivityDescriptor : AbstractChainedDescriptor<Activity>() {

  override fun onGetId(activity: Activity): String {
    return Integer.toString(System.identityHashCode(activity))
  }

  override fun onGetName(activity: Activity): String {
    return activity.javaClass.simpleName
  }

  override fun onGetChildren(activity: Activity, children: MutableList<Any>) {
    activity.window?.let { window -> children.add(activity.window) }

    var fragments = getFragments(FragmentCompat.supportInstance, activity)
    for (fragment in fragments) {
      children.add(fragment)
    }

    fragments = getFragments(FragmentCompat.frameworkInstance, activity)
    for (fragment in fragments) {
      children.add(fragment)
    }
  }

  override fun onGetData(
      activity: Activity,
      attributeSections: MutableMap<String, InspectableObject>
  ) {}

  private fun getFragments(compat: FragmentCompat<*, *, *, *>?, activity: Activity): List<Any> {
    if (compat == null) {
      return emptyList()
    }

    return compat?.getFragments(activity)
  }
}
