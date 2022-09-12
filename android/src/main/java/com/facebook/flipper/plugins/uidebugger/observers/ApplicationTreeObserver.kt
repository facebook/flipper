/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.observers

import android.app.Activity
import android.content.ContextWrapper
import android.util.Log
import android.view.View
import com.facebook.flipper.plugins.uidebugger.LogTag
import com.facebook.flipper.plugins.uidebugger.SubtreeUpdate
import com.facebook.flipper.plugins.uidebugger.TreeObserver
import com.facebook.flipper.plugins.uidebugger.core.ApplicationRef
import com.facebook.flipper.plugins.uidebugger.core.Context
import com.facebook.flipper.plugins.uidebugger.identityHashCode

/**
 * responsible for observing the activity stack and managing the subscription to the top most
 * content view (decor view)
 */
class ApplicationTreeObserver(val context: Context) : TreeObserver<ApplicationRef>() {

  override fun subscribe(node: Any) {
    Log.i(LogTag, "subscribing to application / activity changes")

    val applicationRef = node as ApplicationRef

    val addRemoveListener =
        object : ApplicationRef.ActivityStackChangedListener {

          override fun onActivityAdded(activity: Activity, stack: List<Activity>) {
            val start = System.currentTimeMillis()
            val (nodes, skipped) = context.layoutTraversal.traverse(applicationRef)
            val observer =
                context.observerFactory.createObserver(activity.window.decorView, context)!!
            observer.subscribe(activity.window.decorView)
            children[activity.window.decorView.identityHashCode()] = observer
            context.treeObserverManager.emit(
                SubtreeUpdate("Application", nodes, start, System.currentTimeMillis()))
            Log.i(
                LogTag,
                "Activity added,stack size ${stack.size} found ${nodes.size} skipped $skipped Listeners $children")
          }

          override fun onActivityStackChanged(stack: List<Activity>) {}

          override fun onActivityDestroyed(activity: Activity, stack: List<Activity>) {
            val start = System.currentTimeMillis()

            val (nodes, skipped) = context.layoutTraversal.traverse(applicationRef)

            val observer = children[activity.window.decorView.identityHashCode()]
            children.remove(activity.window.decorView.identityHashCode())
            observer?.cleanUpRecursive()

            context.treeObserverManager.emit(
                SubtreeUpdate("Application", nodes, start, System.currentTimeMillis()))

            Log.i(
                LogTag,
                "Activity removed,stack size ${stack.size} found ${nodes.size} skipped $skipped Listeners $children")
          }
        }

    context.applicationRef.setActivityStackChangedListener(addRemoveListener)

    Log.i(LogTag, "${context.applicationRef.rootViews.size} root views")
    Log.i(LogTag, "${context.applicationRef.activitiesStack.size} activities")

    val stack = context.applicationRef.activitiesStack
    for (activity in stack) {
      addRemoveListener.onActivityAdded(activity, stack)
    }
  }
  private fun getActivity(view: View): Activity? {
    var context: android.content.Context? = view.context
    while (context is ContextWrapper) {
      if (context is Activity) {
        return context
      }
      context = context.baseContext
    }
    return null
  }

  override fun unsubscribe() {
    context.applicationRef.setActivityStackChangedListener(null)
  }
}
