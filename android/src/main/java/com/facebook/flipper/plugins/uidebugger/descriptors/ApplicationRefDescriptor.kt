/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

import android.app.Activity
import android.view.View
import android.view.ViewGroup
import com.facebook.flipper.plugins.uidebugger.core.ApplicationRef
import com.facebook.flipper.plugins.uidebugger.model.Bounds
import com.facebook.flipper.plugins.uidebugger.util.DisplayMetrics

object ApplicationRefDescriptor : ChainedDescriptor<ApplicationRef>() {

  override fun onGetActiveChild(node: ApplicationRef): Any? {
    val children = onGetChildren(node)
    return children.lastOrNull(ApplicationRefDescriptor::isUsefulRoot)
  }

  override fun onGetBounds(node: ApplicationRef): Bounds = DisplayMetrics.getDisplayBounds()

  override fun onGetName(node: ApplicationRef): String {
    val applicationInfo = node.application.applicationInfo
    val stringId = applicationInfo.labelRes
    return if (stringId == 0) applicationInfo.nonLocalizedLabel.toString()
    else node.application.getString(stringId)
  }

  override fun onGetChildren(node: ApplicationRef): List<Any> {
    val children = mutableListOf<Any>()

    val activeRoots = node.rootsResolver.rootViews()

    val decorViewToActivity: Map<View, Activity> =
        node.activitiesStack.toList().associateBy { it.window.decorView }

    for (root in activeRoots) {
      // if there is an activity for this root view use that,
      // if not just return the root view that was added directly to the window manager
      val activity = decorViewToActivity[root]
      if (activity != null) {
        children.add(activity)
      } else {
        children.add(root)
      }
    }

    return children
  }

  fun isUsefulRoot(obj: Any): Boolean {
    if (obj is Activity) {
      return true
    }
    val isFoldableOverlayInfraView = javaClass.simpleName.contains("OverlayHandlerView")
    return if (isFoldableOverlayInfraView) {
      false
    } else if (obj is ViewGroup) {
      // sometimes there is a root view on top that has no children that isn't useful to inspect
      obj.childCount > 0
    } else {
      false
    }
  }
}
