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
import facebook.internal.androidx.compose.ui.inspection.inspector.ParameterType

// Same values as in AndroidX (ComposeLayoutInspector.kt)
private const val MAX_RECURSIONS = 2
private const val MAX_ITERABLE_SIZE = 5

@RequiresApi(Build.VERSION_CODES.Q)
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

  val recompositionCounts: Pair<Int, Int>? by lazy {
    recompositionHandler.getCounts(inspectorNode.key, inspectorNode.anchorId)?.let {
      Pair(it.count, it.skips)
    }
  }

  val children: List<Any> = collectChildren()

  val hasAdditionalData: Boolean
    get() {
      return hasAdditionalParameterData ||
          hasAdditionalMergedSemanticsData ||
          hasAdditionalUnmergedSemanticsData
    }

  private var hasAdditionalParameterData: Boolean = false
  private var hasAdditionalMergedSemanticsData: Boolean = false
  private var hasAdditionalUnmergedSemanticsData: Boolean = false

  fun getParameters(useReflection: Boolean): List<NodeParameter> {
    return getNodeParameters(ParameterKind.Normal, useReflection)
  }

  fun getMergedSemantics(useReflection: Boolean): List<NodeParameter> {
    return getNodeParameters(ParameterKind.MergedSemantics, useReflection)
  }

  fun getUnmergedSemantics(useReflection: Boolean): List<NodeParameter> {
    return getNodeParameters(ParameterKind.UnmergedSemantics, useReflection)
  }

  private fun getNodeParameters(kind: ParameterKind, useReflection: Boolean): List<NodeParameter> {
    layoutInspectorTree.resetAccumulativeState()
    return try {
      val params =
          layoutInspectorTree.convertParameters(
              inspectorNode.id,
              inspectorNode,
              kind,
              MAX_RECURSIONS,
              MAX_ITERABLE_SIZE,
              useReflection)
      if (!useReflection) {
        // We only need to check for additional data if we are not using reflection since
        // params parsed with useReflection == true wont have complex objects
        val hasAdditionalData = hasAdditionalData(params)
        when (kind) {
          ParameterKind.Normal -> hasAdditionalParameterData = hasAdditionalData
          ParameterKind.MergedSemantics -> hasAdditionalMergedSemanticsData = hasAdditionalData
          ParameterKind.UnmergedSemantics -> hasAdditionalUnmergedSemanticsData = hasAdditionalData
        }
      }
      params
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

  private fun hasAdditionalData(params: List<NodeParameter>): Boolean {
    val queue = ArrayDeque<NodeParameter>()
    queue.addAll(params)
    while (!queue.isEmpty()) {
      val param = queue.removeFirst()
      if (param.type == ParameterType.ComplexObject) {
        return true
      }
      queue.addAll(param.elements)
    }
    return false
  }

  companion object {
    private const val TAG = "ComposeNode"
  }
}
