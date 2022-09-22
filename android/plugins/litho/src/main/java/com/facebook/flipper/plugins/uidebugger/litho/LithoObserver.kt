/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.litho

import android.util.Log
import com.facebook.flipper.plugins.uidebugger.LogTag
import com.facebook.flipper.plugins.uidebugger.core.Context
import com.facebook.flipper.plugins.uidebugger.descriptors.nodeId
import com.facebook.flipper.plugins.uidebugger.observers.TreeObserver
import com.facebook.flipper.plugins.uidebugger.observers.TreeObserverBuilder
import com.facebook.litho.LithoView

class LithoViewTreeObserver(val context: Context) : TreeObserver<LithoView>() {

  override val type = "Litho"

  var nodeRef: LithoView? = null

  override fun subscribe(node: Any) {

    Log.i(LogTag, "Subscribing to litho view ${node.nodeId()}")

    nodeRef = node as LithoView

    val listener: (view: LithoView) -> Unit = { traverseAndSend(context, node) }
    node.setOnDirtyMountListener(listener)

    listener(node)
  }

  override fun unsubscribe() {
    Log.i(LogTag, "Unsubscribing from litho view")
    nodeRef?.setOnDirtyMountListener(null)
    nodeRef = null
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
