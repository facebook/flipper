/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.core

import android.util.Log
import android.view.View
import android.view.ViewTreeObserver
import com.facebook.flipper.plugins.uidebugger.LogTag
import com.facebook.flipper.plugins.uidebugger.common.BitmapPool
import com.facebook.flipper.plugins.uidebugger.descriptors.ViewDescriptor
import com.facebook.flipper.plugins.uidebugger.util.StopWatch
import com.facebook.flipper.plugins.uidebugger.util.Throttler
import com.facebook.flipper.plugins.uidebugger.util.objectIdentity

/**
 * The responsibility of this class is to find the top most decor view and add a pre draw observer
 * to it This predraw observer triggers a full traversal of the UI. There should only ever be one
 * active predraw listener at once
 */
class DecorViewTracker(val context: UIDContext) {

  private var currentDecorView: View? = null
  private var preDrawListener: ViewTreeObserver.OnPreDrawListener? = null
  private val mStopWatch = StopWatch()

  fun start() {
    Log.i(LogTag, "Subscribing activity / root view changes")

    val applicationRef = context.applicationRef

    val rootViewListener =
        object : RootViewResolver.Listener {
          override fun onRootViewAdded(rootView: View) {}

          override fun onRootViewRemoved(rootView: View) {}

          override fun onRootViewsChanged(rootViews: List<View>) {
            // remove predraw listen from current view as its going away or will be covered
            currentDecorView?.viewTreeObserver?.removeOnPreDrawListener(preDrawListener)

            // setup new listener on top most view
            val topView = rootViews.lastOrNull()
            val throttler = Throttler(500) { currentDecorView?.let { traverseSnapshotAndSend(it) } }

            if (topView != null) {
              preDrawListener =
                  ViewTreeObserver.OnPreDrawListener {
                    throttler.trigger()
                    true
                  }

              topView.viewTreeObserver.addOnPreDrawListener(preDrawListener)
              currentDecorView = topView

              Log.i(LogTag, "Added pre draw listener to ${topView.objectIdentity()}")

              // schedule traversal immediately when we detect a new decor view
              throttler.trigger()
            } else {
              Log.i(LogTag, "Stack is empty")
            }
          }
        }

    context.applicationRef.rootsResolver.attachListener(rootViewListener)
    // On subscribe, trigger a traversal on whatever roots we have
    rootViewListener.onRootViewsChanged(applicationRef.rootsResolver.rootViews())

    Log.i(LogTag, "${context.applicationRef.rootsResolver.rootViews().size} root views")
    Log.i(LogTag, "${context.applicationRef.activitiesStack.size} activities")
  }

  fun stop() {
    context.applicationRef.rootsResolver.attachListener(null)
    currentDecorView?.viewTreeObserver?.removeOnPreDrawListener(preDrawListener)
    currentDecorView = null
    preDrawListener = null
  }

  private fun traverseSnapshotAndSend(decorView: View) {

    val startTimestamp = System.currentTimeMillis()
    val (nodes, traversalTime) =
        StopWatch.time { context.layoutTraversal.traverse(context.applicationRef) }

    mStopWatch.start()
    var snapshotBitmap: BitmapPool.ReusableBitmap? = null
    if (decorView.width > 0 && decorView.height > 0) {
      snapshotBitmap = context.bitmapPool.getBitmap(decorView.width, decorView.height)
      context.bitmapPool.getBitmap(decorView.width, decorView.height)
      Log.i(
          LogTag,
          "Snapshotting view ${ViewDescriptor.getId(decorView)}",
      )
      ViewDescriptor.getSnapshot(decorView, snapshotBitmap.bitmap)
    }
    val snapshotTime = mStopWatch.stop()

    context.updateQueue.enqueueUpdate(
        Update(
            ViewDescriptor.getId(decorView),
            nodes,
            startTimestamp,
            traversalTime,
            snapshotTime,
            System.currentTimeMillis(),
            snapshotBitmap))
  }
}
