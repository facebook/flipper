/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

import android.app.Activity
import android.content.res.Resources
import android.view.View
import com.facebook.flipper.plugins.uidebugger.core.ApplicationRef
import com.facebook.flipper.plugins.uidebugger.model.Bounds

object ApplicationRefDescriptor : ChainedDescriptor<ApplicationRef>() {

  override fun onGetActiveChild(node: ApplicationRef): Any? {
    return if (node.activitiesStack.isNotEmpty()) node.activitiesStack.last() else null
  }

  override fun onGetBounds(node: ApplicationRef): Bounds {
    val displayMetrics = Resources.getSystem().displayMetrics
    return Bounds(0, 0, displayMetrics.widthPixels, displayMetrics.heightPixels)
  }

  override fun onGetName(node: ApplicationRef): String {
    val applicationInfo = node.application.applicationInfo
    val stringId = applicationInfo.labelRes
    return if (stringId == 0) applicationInfo.nonLocalizedLabel.toString()
    else node.application.getString(stringId)
  }

  override fun onGetChildren(node: ApplicationRef): List<Any> {
    val children = mutableListOf<Any>()

    val activeRoots = node.rootViews

    val added = mutableSetOf<View>()
    for (activity: Activity in node.activitiesStack) {
      children.add(activity)
      added.add(activity.window.decorView)
    }

    // Picks up root views not tied to an activity (dialogs)
    for (root in activeRoots) {
      if (!added.contains(root)) {
        children.add(root)
        added.add(root)
      }
    }

    return children
  }
}
