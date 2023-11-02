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
import com.facebook.flipper.plugins.uidebugger.core.ActivityTracker
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

    val rootViews = node.rootsResolver.rootViews()

    val decorViewToActivity: Map<View, Activity> = ActivityTracker.decorViewToActivityMap

    for (root in rootViews) {
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

  /**
   * arg is either an acitivity if the root view has one other views the root view attached to the
   * window manager returns boolean indicating whether we are interested in it and whether we should
   * track, traverse and snapshot it
   */
  fun isUsefulRoot(rootViewOrActivity: Any): Boolean {
    val className = rootViewOrActivity.javaClass.name

    if (className.contains("mediagallery.ui.MediaGalleryActivity")) {
      // this activity doesn't contain the content and its actually in the decor view behind it, so
      // skip it :/
      return false
    }

    if (rootViewOrActivity is Activity) {
      // in general we want views attached to activities
      return true
    }

    val isFoldableOverlayInfraView = className.contains("OverlayHandlerView")
    return if (isFoldableOverlayInfraView) {
      false
    } else if (rootViewOrActivity is ViewGroup) {
      // sometimes there is a root view on top that has no children that isn't useful to inspect
      rootViewOrActivity.childCount > 0
    } else {
      false
    }
  }
}
