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
import com.facebook.flipper.plugins.uidebugger.SubtreeUpdate
import com.facebook.flipper.plugins.uidebugger.TreeObserver
import com.facebook.flipper.plugins.uidebugger.core.Context

typealias DecorView = View

/** Responsible for subscribing to updates to the content view of an activity */
class DecorViewObserver(val context: Context) : TreeObserver<DecorView>() {

  val throttleTimeMs = 500

  // maybe should be weak reference in ctor?
  private var nodeRef: View? = null
  private var listener: ViewTreeObserver.OnPreDrawListener? = null

  override fun subscribe(node: Any) {

    node as View
    nodeRef = node

    Log.i(LogTag, "Subscribing to decor view changes")

    listener =
        object : ViewTreeObserver.OnPreDrawListener {
          var lastSend = 0L
          override fun onPreDraw(): Boolean {
            val start = System.currentTimeMillis()
            if (start - lastSend > throttleTimeMs) {
              val (nodes, skipped) = context.layoutTraversal.traverse(node)
              val traversalComplete = System.currentTimeMillis()
              context.treeObserverManager.emit(
                  SubtreeUpdate("DecorView", nodes, start, traversalComplete))
              lastSend = System.currentTimeMillis()
            }
            return true
          }
        }

    node.viewTreeObserver.addOnPreDrawListener(listener)
  }

  override fun unsubscribe() {
    Log.i(LogTag, "Try Unsubscribing to decor view changes")

    listener.let {
      Log.i(LogTag, "Actually Unsubscribing to decor view changes")

      nodeRef?.viewTreeObserver?.removeOnPreDrawListener(it)
      listener = null
      nodeRef = null
    }
  }
}

object DecorViewTreeObserverBuilder : TreeObserverBuilder<DecorView> {
  override fun canBuildFor(node: Any): Boolean {
    return node.javaClass.simpleName.contains("DecorView")
  }

  override fun build(context: Context): TreeObserver<DecorView> {
    Log.i(LogTag, "Building decor view observer")
    return DecorViewObserver(context)
  }
}
