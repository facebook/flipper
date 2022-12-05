/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.observers

import android.util.Log
import android.view.View
import com.facebook.flipper.plugins.uidebugger.LogTag
import com.facebook.flipper.plugins.uidebugger.core.ApplicationRef
import com.facebook.flipper.plugins.uidebugger.core.Context
import com.facebook.flipper.plugins.uidebugger.core.RootViewResolver

/**
 * Responsible for observing the activity stack and managing the subscription to the top most
 * content view (decor view)
 */
class ApplicationTreeObserver(val context: Context) : TreeObserver<ApplicationRef>() {

  override val type = "Application"

  override fun subscribe(node: Any) {
    Log.i(LogTag, "Subscribing activity / root view changes")

    val applicationRef = node as ApplicationRef

    val rootViewListener =
        object : RootViewResolver.Listener {
          override fun onRootViewAdded(rootView: View) {}

          override fun onRootViewRemoved(rootView: View) {}

          override fun onRootViewsChanged(rootViews: List<View>) {
            Log.i(LogTag, "Root views updated, num ${rootViews.size}")
            processUpdate(context, applicationRef)
          }
        }
    context.applicationRef.rootsResolver.attachListener(rootViewListener)
    // On subscribe, trigger a traversal on whatever roots we have
    rootViewListener.onRootViewsChanged(applicationRef.rootsResolver.rootViews())

    Log.i(LogTag, "${context.applicationRef.rootsResolver.rootViews().size} root views")
    Log.i(LogTag, "${context.applicationRef.activitiesStack.size} activities")
  }

  override fun unsubscribe() {
    context.applicationRef.rootsResolver.attachListener(null)
  }
}
