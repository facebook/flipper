/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.core

import android.view.View
import android.view.ViewTreeObserver
import java.util.List

class ApplicationInspector(val context: Context) {

  fun traverse(view: View) {
    val inspector =
        LayoutVisitor.create(
            object : LayoutVisitor.Visitor {
              override fun visit(view: View) {}
            })
    inspector.traverse(view)
  }

  fun attachListeners(view: View) {
    // An OnGlobalLayoutListener watches the entire hierarchy for layout changes
    // (so registering one of these on any View in a hierarchy will cause it to be triggered
    // when any View in that hierarchy is laid out or changes visibility).
    view
        .getViewTreeObserver()
        .addOnGlobalLayoutListener(
            object : ViewTreeObserver.OnGlobalLayoutListener {
              override fun onGlobalLayout() {}
            })
    view
        .getViewTreeObserver()
        .addOnPreDrawListener(
            object : ViewTreeObserver.OnPreDrawListener {
              override fun onPreDraw(): Boolean {
                return true
              }
            })
  }

  fun observe() {
    val rootResolver = RootViewResolver()
    rootResolver.attachListener(
        object : RootViewResolver.Listener {
          override fun onRootViewAdded(view: View) {
            attachListeners(view)
          }

          override fun onRootViewRemoved(view: View) {}

          override fun onRootViewsChanged(views: List<View>) {}
        })

    val activeRoots = rootResolver.listActiveRootViews()
    activeRoots?.let { roots ->
      for (root: RootViewResolver.RootView in roots) {
        traverse(root.view)
      }
    }
  }
}
