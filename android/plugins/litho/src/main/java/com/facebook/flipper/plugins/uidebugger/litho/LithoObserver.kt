/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.litho

import android.annotation.SuppressLint
import android.util.Log
import android.view.ViewTreeObserver
import com.facebook.flipper.plugins.uidebugger.LogTag
import com.facebook.flipper.plugins.uidebugger.core.Context
import com.facebook.flipper.plugins.uidebugger.descriptors.ViewDescriptor
import com.facebook.flipper.plugins.uidebugger.descriptors.nodeId
import com.facebook.flipper.plugins.uidebugger.litho.descriptors.LithoViewDescriptor
import com.facebook.flipper.plugins.uidebugger.model.Bounds
import com.facebook.flipper.plugins.uidebugger.model.Coordinate
import com.facebook.flipper.plugins.uidebugger.observers.CoordinateUpdate
import com.facebook.flipper.plugins.uidebugger.observers.TreeObserver
import com.facebook.flipper.plugins.uidebugger.observers.TreeObserverBuilder
import com.facebook.flipper.plugins.uidebugger.scheduler.throttleLatest
import com.facebook.litho.LithoView
import com.facebook.rendercore.extensions.ExtensionState
import com.facebook.rendercore.extensions.MountExtension
import kotlinx.coroutines.*

/**
 * There are 2 ways a litho view can update:
 * 1. A view was added / updated / removed through a mount, This should be refelected in a change in
 * props / state so we use the mount extension to capture these including the entire component tree
 * 2. The coordinate of the litho view changes externally and doesn't cause a mount, examples:
 * - Sibling changed size or position and shifted this view
 * - User scrolled
 *
 * These are not interesting from UI debugger perspective, we don't want to send the whole subtree
 * as only the Coordinate of the root litho view has changed. For this situation we send a
 * lightweight coordinate update event to distinguish these 2 cases
 *
 * If an external event such as a scroll does does lead to a mount (new view in recycler view) this
 * will be picked up by the mount extension
 */
class LithoViewTreeObserver(val context: Context) : TreeObserver<LithoView>() {

  override val type = "Litho"
  private val throttleTimeMs = 100L

  private val waitScope = CoroutineScope(Dispatchers.IO)
  private val mainScope = CoroutineScope(Dispatchers.Main)

  var lastBounds: Bounds? = null

  var nodeRef: LithoView? = null
  private var preDrawListener: ViewTreeObserver.OnPreDrawListener? = null
  @SuppressLint("PrivateApi")
  override fun subscribe(node: Any) {

    Log.d(LogTag, "Subscribing to litho view ${node.nodeId()}")

    nodeRef = node as LithoView

    val lithoDebuggerExtension = LithoDebuggerExtension(this)
    node.registerUIDebugger(lithoDebuggerExtension)

    val throttledCordinateUpdate =
        throttleLatest<LithoView>(throttleTimeMs, waitScope, mainScope) { node ->
          // use the descriptor to get the bounds since we do some magic in there
          val bounds = ViewDescriptor.onGetBounds(node)
          if (bounds != lastBounds) {
            context.treeObserverManager.enqueueUpdate(
                CoordinateUpdate(this.type, node.nodeId(), Coordinate(bounds.x, bounds.y)))
            lastBounds = bounds
          }
        }

    preDrawListener =
        ViewTreeObserver.OnPreDrawListener {
          // this cases case 2
          throttledCordinateUpdate(node)
          true
        }

    node.viewTreeObserver.addOnPreDrawListener(preDrawListener)

    // we have already missed the first mount so we trigger it manually on subscribe
    lastBounds = LithoViewDescriptor.onGetBounds(node)
    processUpdate(context, node)
  }

  override fun unsubscribe() {
    Log.d(LogTag, "Unsubscribing from litho view ${nodeRef?.nodeId()}")
    nodeRef?.viewTreeObserver?.removeOnPreDrawListener(preDrawListener)
    nodeRef?.unregisterUIDebugger()
    nodeRef = null
  }
}

class LithoDebuggerExtension(val observer: LithoViewTreeObserver) : MountExtension<Void?, Void?>() {

  override fun createState(): Void? {
    return null
  }

  /**
   * The call guaranteed to be called after new layout mounted completely on the main thread.
   * mounting includes adding updating or removing views from the heriachy
   */
  override fun afterMount(state: ExtensionState<Void?>) {
    Log.i(LogTag, "After mount called for litho view ${observer.nodeRef?.nodeId()}")
    observer.lastBounds = ViewDescriptor.onGetBounds(state.rootHost)
    observer.processUpdate(observer.context, state.rootHost as Any)
  }
}

object LithoViewTreeObserverBuilder : TreeObserverBuilder<LithoView> {
  override fun canBuildFor(node: Any): Boolean {
    return node is LithoView
  }

  override fun build(context: Context): TreeObserver<LithoView> {
    return LithoViewTreeObserver(context)
  }
}
