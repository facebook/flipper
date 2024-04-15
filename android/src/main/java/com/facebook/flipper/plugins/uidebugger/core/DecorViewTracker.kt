/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.core

import android.app.Activity
import android.util.Log
import android.view.View
import android.view.ViewTreeObserver
import com.facebook.flipper.plugins.uidebugger.LogTag
import com.facebook.flipper.plugins.uidebugger.descriptors.ApplicationRefDescriptor
import com.facebook.flipper.plugins.uidebugger.descriptors.ViewDescriptor
import com.facebook.flipper.plugins.uidebugger.util.StopWatch
import com.facebook.flipper.plugins.uidebugger.util.Throttler
import com.facebook.flipper.plugins.uidebugger.util.objectIdentity
import curtains.Curtains
import curtains.OnRootViewsChangedListener

/**
 * The UIDebugger does 3 things:
 * 1. Observe changes
 * 2. Traverse UI hierarchy, gathering tree
 * 3. Generate snapshot
 *
 * All 3 of these stages need to work on the same view else there will be major inconsistencies
 *
 * The first responsibility of this class is to track changes to root views, find the top most decor
 * view and add a pre draw observer to it. There should only ever be one active predraw listener at
 * once.
 *
 * This pre-draw observer triggers a full traversal of the UI, the traversal of the hierarchy might
 * skip some branches (active child) so its essential that both the active child decision and top
 * root decision match.
 *
 * The observer also triggers a snapshot, again its essential the same root view as we do for
 * traversal and observation
 */
class DecorViewTracker(private val context: UIDContext, private val snapshotter: Snapshotter) {

  private var currentDecorView: View? = null
  private var preDrawListener: ViewTreeObserver.OnPreDrawListener? = null

  fun start() {

    val rootViewChangedListener = OnRootViewsChangedListener { view, added ->
      if (currentDecorView != null) {
        // remove predraw listen from current view as its going away or will be covered
        Log.d(LogTag, "Removing pre draw listener from ${currentDecorView?.objectIdentity()}")
        currentDecorView?.viewTreeObserver?.removeOnPreDrawListener(preDrawListener)
      }

      val decorViewToActivity: Map<View, Activity> = ActivityTracker.decorViewToActivityMap

      // at the time of this callback curtains.rootViews is not updated yet, so we need to use the
      // 'view' and 'added' params to the callback to see any new root views
      val topView =
          if (added && ApplicationRefDescriptor.isUsefulRoot(decorViewToActivity[view] ?: view)) {
            view
          } else {
            // this is technically the preview set of root view but this is the branch where the new
            // root view is not 'useful' or we are popping a view off the stack so the old roots are
            // fine here
            Curtains.rootViews.lastOrNull {
              ApplicationRefDescriptor.isUsefulRoot(decorViewToActivity[it] ?: it)
            }
          }

      if (topView != null) {
        val throttler = Throttler(500) { currentDecorView?.let { traverseSnapshotAndSend(it) } }

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
      }
    }

    Curtains.onRootViewsChangedListeners.add(rootViewChangedListener)

    // On subscribe, trigger a traversal on whatever roots we have
    val decorViewToActivity: Map<View, Activity> = ActivityTracker.decorViewToActivityMap

    val topView =
        Curtains.rootViews.lastOrNull {
          ApplicationRefDescriptor.isUsefulRoot(decorViewToActivity[it] ?: it)
        }
    if (topView != null) {
      rootViewChangedListener.onRootViewsChanged(topView, true)
    }

    Log.i(LogTag, "Starting tracking root views, currently ${Curtains.rootViews.size} root views")
  }

  fun stop() {
    Curtains.onRootViewsChangedListeners.clear()
    currentDecorView?.viewTreeObserver?.removeOnPreDrawListener(preDrawListener)
    currentDecorView = null
    preDrawListener = null
  }

  private suspend fun traverseSnapshotAndSend(decorView: View) {

    val startTimestamp = System.currentTimeMillis()

    val (nodes, traversalTime) =
        StopWatch.time { context.layoutTraversal.traverse(context.applicationRef) }

    val (reusableBitmap, snapshotMs) = StopWatch.timeSuspend { snapshotter.takeSnapshot(decorView) }

    context.updateQueue.enqueueUpdate(
        Update(
            ViewDescriptor.getId(decorView),
            nodes,
            startTimestamp,
            traversalTime,
            snapshotMs,
            System.currentTimeMillis(),
            reusableBitmap))
  }
}
