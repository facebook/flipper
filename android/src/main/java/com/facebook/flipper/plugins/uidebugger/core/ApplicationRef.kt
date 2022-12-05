/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.core

import android.app.Activity
import android.app.Application

class ApplicationRef(val application: Application) {
  init {
    ActivityTracker.start(application)
  }

  // the root view resolver will contain all root views 100% It is needed for 2 cases:
  // 1. In some cases an activity will not be picked up by the activity tracker,
  // the root view resolver will at least find the decor view
  // 2. Dialog fragments
  val rootsResolver: RootViewResolver = RootViewResolver()

  val activitiesStack: List<Activity>
    get() {
      return ActivityTracker.activitiesStack
    }
}
