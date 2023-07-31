/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.observers

import android.util.Log
import android.view.View
import android.view.ViewTreeObserver
import com.facebook.flipper.plugins.uidebugger.LogTag
import com.facebook.flipper.plugins.uidebugger.common.BitmapPool
import com.facebook.flipper.plugins.uidebugger.core.UIDContext
import com.facebook.flipper.plugins.uidebugger.descriptors.Id
import com.facebook.flipper.plugins.uidebugger.util.objectIdentity
import java.lang.ref.WeakReference

typealias DecorView = View

/** Responsible for subscribing to updates to the content view of an activity */
class DecorViewObserver(val context: UIDContext) : TreeObserver<DecorView>() {

  private var nodeRef: WeakReference<View>? = null
  private var preDrawListener: ViewTreeObserver.OnPreDrawListener? = null

  override val type = "DecorView"

  override fun subscribe(node: Any, parentId: Id?) {
    node as View
    nodeRef = WeakReference(node)

    Log.i(LogTag, "Subscribing to decor view changes")

    context.sharedThrottle.registerCallback(this.objectIdentity()) {
      nodeRef?.get()?.let { traverseAndSendWithSnapshot(parentId) }
    }

    preDrawListener =
        ViewTreeObserver.OnPreDrawListener {
          context.sharedThrottle.trigger()
          true
        }

    node.viewTreeObserver.addOnPreDrawListener(preDrawListener)

    // It can be the case that the DecorView the current observer owns has already
    // drawn. In this case, manually trigger an update.
    traverseAndSendWithSnapshot(parentId)
  }

  private fun traverseAndSendWithSnapshot(parentId: Id?) {
    nodeRef?.get()?.let { view ->
      var snapshotBitmap: BitmapPool.ReusableBitmap? = null
      if (view.width > 0 && view.height > 0) {
        snapshotBitmap = context.bitmapPool.getBitmap(view.width, view.height)
      }
      traverseAndSend(
          parentId,
          context,
          view,
          snapshotBitmap,
      )
    }
  }

  override fun unsubscribe() {
    Log.i(LogTag, "Unsubscribing from decor view changes")

    preDrawListener.let {
      nodeRef?.get()?.viewTreeObserver?.removeOnPreDrawListener(it)
      preDrawListener = null
    }

    context.sharedThrottle.deregisterCallback(this.objectIdentity())
    nodeRef?.clear()
    nodeRef = null
  }
}

object DecorViewTreeObserverBuilder : TreeObserverBuilder<DecorView> {
  override fun canBuildFor(node: Any): Boolean {
    return node.javaClass.simpleName.contains("DecorView")
  }

  override fun build(context: UIDContext): TreeObserver<DecorView> {
    Log.i(LogTag, "Building DecorView observer")
    return DecorViewObserver(context)
  }
}
