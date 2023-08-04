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
import com.facebook.flipper.plugins.uidebugger.core.RootViewResolver
import com.facebook.flipper.plugins.uidebugger.core.UIDContext
import com.facebook.flipper.plugins.uidebugger.descriptors.Id
import com.facebook.flipper.plugins.uidebugger.util.objectIdentity

/**
 * Responsible for observing the activity stack and managing the subscription to the top most
 * content view (decor view)
 */
class ApplicationTreeObserver(val context: UIDContext) : TreeObserver<ApplicationRef>() {

  override val type = "Application"

  override fun subscribe(node: Any, parentId: Id?) {
    Log.i(LogTag, "Subscribing activity / root view changes")

    val applicationRef = node as ApplicationRef

    val rootViewListener =
        object : RootViewResolver.Listener {
          override fun onRootViewAdded(rootView: View) {}

          override fun onRootViewRemoved(rootView: View) {}

          override fun onRootViewsChanged(rootViews: List<View>) {
            Log.i(LogTag, "Root views updated, num ${rootViews.size}")
            context.sharedThrottle.trigger()
          }
        }

    context.sharedThrottle.registerCallback(this.objectIdentity()) {
      traverseAndSend(null, context, applicationRef)
    }

    context.applicationRef.rootsResolver.attachListener(rootViewListener)
    // On subscribe, trigger a traversal on whatever roots we have
    rootViewListener.onRootViewsChanged(applicationRef.rootsResolver.rootViews())

    Log.i(LogTag, "${context.applicationRef.rootsResolver.rootViews().size} root views")
    Log.i(LogTag, "${context.applicationRef.activitiesStack.size} activities")
  }

  override fun unsubscribe() {
    context.applicationRef.rootsResolver.attachListener(null)
    context.sharedThrottle.deregisterCallback(this.objectIdentity())
  }
}
