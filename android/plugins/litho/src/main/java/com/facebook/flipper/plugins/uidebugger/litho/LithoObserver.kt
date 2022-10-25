/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.litho

import android.util.Log
import android.view.ViewTreeObserver
import com.facebook.flipper.plugins.uidebugger.LogTag
import com.facebook.flipper.plugins.uidebugger.core.Context
import com.facebook.flipper.plugins.uidebugger.descriptors.nodeId
import com.facebook.flipper.plugins.uidebugger.observers.TreeObserver
import com.facebook.flipper.plugins.uidebugger.observers.TreeObserverBuilder
import com.facebook.flipper.plugins.uidebugger.scheduler.throttleLatest
import com.facebook.litho.LithoView
import com.facebook.rendercore.extensions.ExtensionState
import com.facebook.rendercore.extensions.MountExtension
import kotlinx.coroutines.*

/**
 * There are 2 ways a litho view can update:
 * 1. a view was added / updated / removed through a mount ,we use the mount extension to capture
 * these
 * 2. The user scrolled. This does not cause a mount to the litho view but it may cause new
 * components to mount as they come on screen On the native side we capture scrolls as it causes the
 * draw listener to first but but the layout traversal would stop once it sees the lithoview.
 *
 * Therefore we need a way to capture the changes in the position of views in a litho view hierarchy
 * as they are scrolled. A property that seems to hold for litho is if there is a scrolling view in
 * the heierachy, its direct children are lithoview.
 *
 * Given that we are observing a litho view in this class for mount extension we can also attach a
 * on scroll changed listener to it to be notified by android when it is scrolled. We just need to
 * then update the bounds for this view as nothing else has changed. If this scroll does lead to a
 * mount this will be picked up by the mount extension
 */
class LithoViewTreeObserver(val context: Context) : TreeObserver<LithoView>() {

  override val type = "Litho"
  private val throttleTimeMs = 500L

  private val waitScope = CoroutineScope(Dispatchers.IO)
  private val mainScope = CoroutineScope(Dispatchers.Main)
  var nodeRef: LithoView? = null
  var onScrollChangedListener: ViewTreeObserver.OnScrollChangedListener? = null

  override fun subscribe(node: Any) {

    Log.d(LogTag, "Subscribing to litho view ${node.nodeId()}")

    nodeRef = node as LithoView

    val lithoDebuggerExtension = LithoDebuggerExtension(this)
    node.registerUIDebugger(lithoDebuggerExtension)

    val throttledUpdate =
        throttleLatest<Any>(throttleTimeMs, waitScope, mainScope) { node ->
          // todo only send bounds for the view rather than the entire hierachy
          processUpdate(context, node)
        }

    onScrollChangedListener = ViewTreeObserver.OnScrollChangedListener({ throttledUpdate(node) })
    node.viewTreeObserver.addOnScrollChangedListener(onScrollChangedListener)

    // we have already missed the first mount so we trigger it manually on subscribe
    processUpdate(context, node)
  }

  override fun unsubscribe() {
    Log.d(LogTag, "Unsubscribing from litho view ${nodeRef?.nodeId()}")
    nodeRef?.viewTreeObserver?.removeOnScrollChangedListener(onScrollChangedListener)
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
    // todo sparse update
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
