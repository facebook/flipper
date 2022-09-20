/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.core

import android.app.Activity
import android.app.Application
import android.view.View

class ApplicationRef(val application: Application) {
  init {
    ActivityTracker.start(application)
  }

  val rootsResolver: RootViewResolver = RootViewResolver()

  val activitiesStack: List<Activity>
    get() {
      return ActivityTracker.activitiesStack
    }

  val rootViews: List<View>
    get() {
      val activeRootViews = rootsResolver.listActiveRootViews()
      activeRootViews?.let { roots ->
        val viewRoots: MutableList<View> = ArrayList(roots.size)
        for (root in roots) {
          viewRoots.add(root.view)
        }
        return viewRoots
      }

      return emptyList()
    }
}
