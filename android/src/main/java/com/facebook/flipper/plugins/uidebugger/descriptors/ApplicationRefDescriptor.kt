/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

import android.app.Activity
import android.util.Log
import com.facebook.flipper.plugins.uidebugger.LogTag
import com.facebook.flipper.plugins.uidebugger.core.ApplicationRef
import com.facebook.flipper.plugins.uidebugger.core.RootViewResolver

object ApplicationRefDescriptor : ChainedDescriptor<ApplicationRef>() {

  val rootsLocal = RootViewResolver()
  override fun onGetActiveChild(node: ApplicationRef): Any? {
    return if (node.activitiesStack.isNotEmpty()) node.activitiesStack.last() else null
  }

  override fun onGetId(node: ApplicationRef): String {
    return node.application.packageName
  }

  override fun onGetName(node: ApplicationRef): String {
    val applicationInfo = node.application.applicationInfo
    val stringId = applicationInfo.labelRes
    return if (stringId == 0) applicationInfo.nonLocalizedLabel.toString()
    else node.application.getString(stringId)
  }

  override fun onGetChildren(node: ApplicationRef, children: MutableList<Any>) {
    val activeRoots = node.rootViews

    Log.i(LogTag, rootsLocal.toString())
    activeRoots.let { roots ->
      for (root in roots) {
        var added = false
        /**
         * This code serves 2 purposes: 1.it picks up root views not tied to an activity (dialogs)
         * 2. We can get initialized late and miss the first activity, it does seem that the root
         * view resolver is able to (usually ) get the root view regardless, with this we insert the
         * root decor view without the activity. Ideally we wouldn't rely on this behaviour and find
         * a better way to track activities
         */
        for (activity: Activity in node.activitiesStack) {
          if (activity.window.decorView == root) {
            children.add(activity)
            added = true
            break
          }
        }
        if (!added) {
          children.add(root)
        }
      }
    }
  }
}
