/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.jetpackcompose.model

import android.os.Build
import android.view.View
import android.view.ViewGroup
import androidx.annotation.RequiresApi
import com.facebook.flipper.plugins.uidebugger.model.*
import facebook.internal.androidx.compose.ui.inspection.inspector.InspectorNode

class ComposeNode(
    private val parentComposeView: View,
    val inspectorNode: InspectorNode,
    xOffset: Int,
    yOffset: Int
) {
  val bounds: Bounds =
      Bounds(
          inspectorNode.left - xOffset,
          inspectorNode.top - yOffset,
          inspectorNode.width,
          inspectorNode.height)

  val children: List<Any> = collectChildren()

  private fun collectChildren(): List<Any> {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      val viewId = inspectorNode.viewId
      if (viewId != 0L) {
        val view = parentComposeView.findViewByDrawingId(viewId)
        if (view != null) {
          return listOf(ComposeInnerViewNode(view))
        }
      }
    }

    return inspectorNode.children.map { child ->
      ComposeNode(parentComposeView, child, inspectorNode.left, inspectorNode.top)
    }
  }

  @RequiresApi(Build.VERSION_CODES.Q)
  private fun View.findViewByDrawingId(drawingId: Long): View? {
    if (this.uniqueDrawingId == drawingId) {
      return this
    }
    if (this is ViewGroup) {
      for (i in 0 until this.childCount) {
        val child = this.getChildAt(i)
        val foundView = child.findViewByDrawingId(drawingId)
        if (foundView != null) {
          return foundView
        }
      }
    }
    return null
  }
}
