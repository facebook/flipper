/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.core

import android.app.Activity
import android.app.Application
import android.os.Bundle
import android.view.View
import java.lang.ref.WeakReference

class ApplicationRef(val application: Application) : Application.ActivityLifecycleCallbacks {
  interface ActivityStackChangedListener {
    fun onActivityAdded(activity: Activity, stack: List<Activity>)
    fun onActivityStackChanged(stack: List<Activity>)
    fun onActivityDestroyed(activity: Activity, stack: List<Activity>)
  }

  private val rootsResolver: RootViewResolver
  private val activities: MutableList<WeakReference<Activity>>
  private var activityStackChangedlistener: ActivityStackChangedListener? = null

  override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {
    activities.add(WeakReference<Activity>(activity))
    activityStackChangedlistener?.onActivityAdded(activity, this.activitiesStack)
    activityStackChangedlistener?.onActivityStackChanged(this.activitiesStack)
  }
  override fun onActivityStarted(activity: Activity) {}
  override fun onActivityResumed(activity: Activity) {}
  override fun onActivityPaused(activity: Activity) {}
  override fun onActivityStopped(activity: Activity) {}
  override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) {}
  override fun onActivityDestroyed(activity: Activity) {
    val activityIterator: MutableIterator<WeakReference<Activity>> = activities.iterator()

    while (activityIterator.hasNext()) {
      if (activityIterator.next().get() === activity) {
        activityIterator.remove()
      }
    }

    activityStackChangedlistener?.onActivityDestroyed(activity, this.activitiesStack)
    activityStackChangedlistener?.onActivityStackChanged(this.activitiesStack)
  }

  fun setActivityStackChangedListener(listener: ActivityStackChangedListener?) {
    activityStackChangedlistener = listener
  }

  val activitiesStack: List<Activity>
    get() {
      val stack: MutableList<Activity> = ArrayList<Activity>(activities.size)
      val activityIterator: MutableIterator<WeakReference<Activity>> = activities.iterator()
      while (activityIterator.hasNext()) {
        val activity: Activity? = activityIterator.next().get()
        if (activity == null) {
          activityIterator.remove()
        } else {
          stack.add(activity)
        }
      }
      return stack
    }

  val rootViews: List<View>
    get() {
      val roots = rootsResolver.listActiveRootViews()
      roots?.let { roots ->
        val viewRoots: MutableList<View> = ArrayList<View>(roots.size)
        for (root in roots) {
          viewRoots.add(root.view)
        }
        return viewRoots
      }

      return emptyList()
    }

  init {
    rootsResolver = RootViewResolver()
    application.registerActivityLifecycleCallbacks(this)
    activities = ArrayList<WeakReference<Activity>>()
  }
}
