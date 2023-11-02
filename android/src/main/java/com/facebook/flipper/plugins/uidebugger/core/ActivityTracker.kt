/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.core

import android.annotation.SuppressLint
import android.app.Activity
import android.app.Application
import android.os.Build
import android.os.Bundle
import android.view.View
import java.lang.ref.WeakReference
import java.lang.reflect.Field
import java.lang.reflect.Method

object ActivityTracker : Application.ActivityLifecycleCallbacks {
  interface ActivityStackChangedListener {
    fun onActivityAdded(activity: Activity, stack: List<Activity>)

    fun onActivityStackChanged(stack: List<Activity>)

    fun onActivityDestroyed(activity: Activity, stack: List<Activity>)
  }

  private val activities: MutableList<WeakReference<Activity>> = mutableListOf()
  private val trackedActivities: MutableSet<Int> = mutableSetOf()
  private var activityStackChangedListener: ActivityStackChangedListener? = null

  fun setActivityStackChangedListener(listener: ActivityStackChangedListener?) {
    activityStackChangedListener = listener
  }

  fun start(application: Application) {
    initialiseActivities()
    application.registerActivityLifecycleCallbacks(this)
  }

  private fun trackActivity(activity: Activity) {
    if (trackedActivities.contains(System.identityHashCode(activity))) {
      return
    }

    trackedActivities.add(System.identityHashCode(activity))
    activities.add(WeakReference<Activity>(activity))

    FragmentTracker.trackFragmentsOfActivity(activity)

    activityStackChangedListener?.onActivityAdded(activity, this.activitiesStack)
    activityStackChangedListener?.onActivityStackChanged(this.activitiesStack)
  }

  private fun untrackActivity(activity: Activity) {
    trackedActivities.remove(System.identityHashCode(activity))
    val activityIterator: MutableIterator<WeakReference<Activity>> = activities.iterator()

    while (activityIterator.hasNext()) {
      if (activityIterator.next().get() === activity) {
        activityIterator.remove()
      }
    }

    FragmentTracker.untrackFragmentsOfActivity(activity)

    activityStackChangedListener?.onActivityDestroyed(activity, this.activitiesStack)
    activityStackChangedListener?.onActivityStackChanged(this.activitiesStack)
  }

  override fun onActivityCreated(activity: Activity, bundle: Bundle?) {
    trackActivity(activity)
  }

  override fun onActivityStarted(activity: Activity) {
    trackActivity(activity)
  }

  override fun onActivityResumed(activity: Activity) {}

  override fun onActivityPaused(activity: Activity) {}

  override fun onActivityStopped(activity: Activity) {}

  override fun onActivitySaveInstanceState(activity: Activity, bundle: Bundle) {}

  override fun onActivityDestroyed(activity: Activity) {
    untrackActivity(activity)
  }

  val activitiesStack: List<Activity>
    get() {
      val stack: MutableList<Activity> = ArrayList(activities.size)
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

  val decorViewToActivityMap: Map<View, Activity>
    get() {
      return activitiesStack.toList().associateBy { it.window.decorView }
    }

  /**
   * Activity tracker is used to track activities. However, it cannot track via life-cycle events
   * all those activities that were created prior to initialisation via the `start(application:
   * Application)` method.
   *
   * As such, the method below makes a 'best effort' to find these untracked activities and add them
   * to the tracked list.
   */
  @SuppressLint("PrivateApi", "DiscouragedPrivateApi")
  fun initialiseActivities() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.KITKAT) {
      return
    }

    try {
      val activityThreadClass: Class<*> = Class.forName("android.app.ActivityThread")
      val currentActivityThreadMethod: Method =
          activityThreadClass.getMethod("currentActivityThread")
      val currentActivityThread: Any? = currentActivityThreadMethod.invoke(null)

      currentActivityThread?.let { activityThread ->
        val mActivitiesField: Field = activityThreadClass.getDeclaredField("mActivities")
        mActivitiesField.isAccessible = true
        val mActivities = mActivitiesField.get(activityThread) as android.util.ArrayMap<*, *>
        for (record in mActivities.values) {
          val recordClass: Class<*> = record.javaClass
          val activityField: Field = recordClass.getDeclaredField("activity")
          activityField.isAccessible = true

          val activity = activityField.get(record)
          if (activity != null && activity is Activity) {
            trackActivity(activity)
          }
        }
      }
    } catch (e: Exception) {}
  }
}
