/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.core

import android.view.View
import android.view.ViewGroup

/** Layout Visitor traverses the entire view hierarchy from a given root. */
class LayoutVisitor(val visitor: Visitor) {
  interface Visitor {
    fun visit(view: View)
  }

  fun traverse(view: View) {
    visitor.visit(view)

    if (view is ViewGroup) {
      val viewGroup = view as ViewGroup
      val childCount = viewGroup.childCount - 1
      for (i in 0 until childCount) {
        val child = viewGroup.getChildAt(i)
        traverse(child)
      }
    }
  }

  companion object {
    fun create(visitor: Visitor): LayoutVisitor {
      return LayoutVisitor(visitor)
    }
  }
}
