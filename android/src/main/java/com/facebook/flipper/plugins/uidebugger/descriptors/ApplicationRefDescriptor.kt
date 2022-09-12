/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

import android.app.Activity
import com.facebook.flipper.plugins.uidebugger.common.InspectableObject
import com.facebook.flipper.plugins.uidebugger.core.ApplicationRef
import com.facebook.flipper.plugins.uidebugger.core.RootViewResolver

class ApplicationRefDescriptor : AbstractChainedDescriptor<ApplicationRef>() {
  val rootResolver = RootViewResolver()

  override fun onInit() {}
  override fun onGetActiveChild(node: ApplicationRef): Any? {
    return if (node.activitiesStack.size > 0) node.activitiesStack.last() else null
  }

  override fun onGetId(applicationRef: ApplicationRef): String {
    return applicationRef.application.packageName
  }

  override fun onGetName(applicationRef: ApplicationRef): String {
    val applicationInfo = applicationRef.application.getApplicationInfo()
    val stringId = applicationInfo.labelRes
    return if (stringId == 0) applicationInfo.nonLocalizedLabel.toString()
    else applicationRef.application.getString(stringId)
  }

  override fun onGetChildren(applicationRef: ApplicationRef, children: MutableList<Any>) {
    val activeRoots = rootResolver.listActiveRootViews()

    activeRoots?.let { roots ->
      for (root: RootViewResolver.RootView in roots) {
        var added = false
        for (activity: Activity in applicationRef.activitiesStack) {
          if (activity.window.decorView == root.view) {
            children.add(activity)
            added = true
            break
          }
        }
        if (!added) {
          children.add(root.view)
        }
      }
    }
  }

  override fun onGetData(
      applicationRef: ApplicationRef,
      attributeSections: MutableMap<String, InspectableObject>
  ) {}
}
