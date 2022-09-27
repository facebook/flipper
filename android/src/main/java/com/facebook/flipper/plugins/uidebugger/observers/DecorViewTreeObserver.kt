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
import com.facebook.flipper.plugins.uidebugger.core.Context
import com.facebook.flipper.plugins.uidebugger.scheduler.throttleLatest
import java.lang.ref.WeakReference
import kotlinx.coroutines.*

typealias DecorView = View

/** Responsible for subscribing to updates to the content view of an activity */
class DecorViewObserver(val context: Context) : TreeObserver<DecorView>() {

  private val throttleTimeMs = 500L

  private var nodeRef: WeakReference<View>? = null
  private var listener: ViewTreeObserver.OnPreDrawListener? = null

  override val type = "DecorView"

  private val waitScope = CoroutineScope(Dispatchers.IO)
  private val mainScope = CoroutineScope(Dispatchers.Main)

  override fun subscribe(node: Any) {
    node as View
    nodeRef = WeakReference(node)

    Log.i(LogTag, "Subscribing to decor view changes")

    val throttledUpdate =
        throttleLatest<WeakReference<View>?>(throttleTimeMs, waitScope, mainScope) { weakView ->
          weakView?.get()?.let { view ->
            var snapshotBitmap: BitmapPool.ReusableBitmap? = null
            if (view.width > 0 && view.height > 0) {
              snapshotBitmap = context.bitmapPool.getBitmap(node.width, node.height)
            }
            processUpdate(context, view, snapshotBitmap)
          }
        }

    listener =
        ViewTreeObserver.OnPreDrawListener {
          throttledUpdate(nodeRef)
          true
        }

    node.viewTreeObserver.addOnPreDrawListener(listener)

    // It can be the case that the DecorView the current observer owns has already
    // drawn. In this case, manually trigger an update.
    throttledUpdate(nodeRef)
  }

  override fun unsubscribe() {
    Log.i(LogTag, "Unsubscribing from decor view changes")

    listener.let {
      nodeRef?.get()?.viewTreeObserver?.removeOnPreDrawListener(it)
      listener = null
    }

    nodeRef = null
  }
}

object DecorViewTreeObserverBuilder : TreeObserverBuilder<DecorView> {
  override fun canBuildFor(node: Any): Boolean {
    return node.javaClass.simpleName.contains("DecorView")
  }

  override fun build(context: Context): TreeObserver<DecorView> {
    Log.i(LogTag, "Building DecorView observer")
    return DecorViewObserver(context)
  }
}
