/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.jetpackcompose.model

import android.os.Build
import android.util.Log
import android.view.View
import android.view.ViewGroup
import androidx.annotation.RequiresApi
import com.facebook.flipper.plugins.uidebugger.model.*
import facebook.internal.androidx.compose.ui.inspection.RecompositionHandler
import facebook.internal.androidx.compose.ui.inspection.inspector.InspectorNode
import facebook.internal.androidx.compose.ui.inspection.inspector.LayoutInspectorTree
import facebook.internal.androidx.compose.ui.inspection.inspector.NodeParameter
import facebook.internal.androidx.compose.ui.inspection.inspector.ParameterKind

// Same values as in AndroidX (ComposeLayoutInspector.kt)
private const val MAX_RECURSIONS = 2
private const val MAX_ITERABLE_SIZE = 5

class ComposeNode(
    private val parentComposeView: View,
    private val layoutInspectorTree: LayoutInspectorTree,
    private val recompositionHandler: RecompositionHandler,
    val inspectorNode: InspectorNode,
    xOffset: Int,
    yOffset: Int,
) {
  val bounds: Bounds =
      Bounds(
          inspectorNode.left - xOffset,
          inspectorNode.top - yOffset,
          inspectorNode.width,
          inspectorNode.height)

  val recompositionCount: Int?

  val skipCount: Int?

  val children: List<Any> = collectChildren()

  val parameters: List<NodeParameter>

  val mergedSemantics: List<NodeParameter>

  val unmergedSemantics: List<NodeParameter>

  init {
    val count = recompositionHandler.getCounts(inspectorNode.key, inspectorNode.anchorId)
    recompositionCount = count?.count
    skipCount = count?.skips
    parameters = getNodeParameters(ParameterKind.Normal)
    mergedSemantics = getNodeParameters(ParameterKind.MergedSemantics)
    unmergedSemantics = getNodeParameters(ParameterKind.UnmergedSemantics)
  }

  private fun getNodeParameters(kind: ParameterKind): List<NodeParameter> {
    layoutInspectorTree.resetAccumulativeState()
    return try {
      layoutInspectorTree.convertParameters(
          inspectorNode.id, inspectorNode, kind, MAX_RECURSIONS, MAX_ITERABLE_SIZE)
    } catch (t: Throwable) {
      Log.e(TAG, "Failed to get parameters.", t)
      emptyList()
    }
  }

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
      ComposeNode(
          parentComposeView,
          layoutInspectorTree,
          recompositionHandler,
          child,
          inspectorNode.left,
          inspectorNode.top)
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

  companion object {
    private const val TAG = "ComposeNode"
  }
}
