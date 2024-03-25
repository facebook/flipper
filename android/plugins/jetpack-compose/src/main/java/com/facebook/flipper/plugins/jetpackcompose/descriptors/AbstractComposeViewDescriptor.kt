/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.jetpackcompose.descriptors

import android.os.Build
import android.os.Debug
import android.util.Log
import android.view.View
import androidx.annotation.RequiresApi
import androidx.compose.ui.platform.AbstractComposeView
import androidx.inspection.DefaultArtTooling
import com.facebook.flipper.plugins.jetpackcompose.model.ComposeNode
import com.facebook.flipper.plugins.uidebugger.descriptors.ChainedDescriptor
import com.facebook.flipper.plugins.uidebugger.descriptors.WarningMessage
import facebook.internal.androidx.compose.ui.inspection.RecompositionHandler
import facebook.internal.androidx.compose.ui.inspection.inspector.InspectorNode
import facebook.internal.androidx.compose.ui.inspection.inspector.LayoutInspectorTree
import java.io.IOException

object AbstractComposeViewDescriptor : ChainedDescriptor<AbstractComposeView>() {
  private val recompositionHandler by lazy {
    RecompositionHandler(DefaultArtTooling("Flipper")).apply {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        attachJvmtiAgent()
        startTrackingRecompositions(this)
      }
    }
  }

  override fun onGetName(node: AbstractComposeView): String = node.javaClass.simpleName

  private fun transform(
      view: View,
      nodes: List<InspectorNode>,
      layoutInspectorTree: LayoutInspectorTree
  ): List<ComposeNode> {
    val positionOnScreen = IntArray(2)
    view.getLocationInWindow(positionOnScreen)

    val xOffset = positionOnScreen[0]
    val yOffset = positionOnScreen[1]

    return nodes.map { node ->
      ComposeNode(view, layoutInspectorTree, recompositionHandler, node, xOffset, yOffset)
    }
  }

  override fun onGetChildren(node: AbstractComposeView): List<Any> {
    val children = mutableListOf<Any>()
    val count = node.childCount - 1
    for (i in 0..count) {
      val child: View = node.getChildAt(i)
      children.add(child)

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        val layoutInspector = LayoutInspectorTree()
        layoutInspector.hideSystemNodes = true
        val composeNodes =
            try {
              transform(child, layoutInspector.convert(child), layoutInspector)
            } catch (t: Throwable) {
              listOf(
                  WarningMessage(
                      "Unknown error occurred while trying to inspect compose node: ${t.message}",
                      getBounds(node)))
            }
        return if (composeNodes.isNullOrEmpty()) {
          listOf(
              WarningMessage(
                  "Go to developer options and make sure that \"Enable view attribute inspection\" option is enabled.",
                  getBounds(node)))
        } else {
          composeNodes
        }
      }
    }

    return children
  }

  @RequiresApi(Build.VERSION_CODES.Q)
  private fun attachJvmtiAgent() {
    try {
      Debug.attachJvmtiAgent("nonexistent.so", null, null)
    } catch (e: IOException) {
      // expected: "nonexistent.so" doesn't exist, however attachJvmtiAgent call is enough
      // to make art to load JVMTI plugin.
    }
  }

  private fun startTrackingRecompositions(recompositionHandler: RecompositionHandler) {
    try {
      recompositionHandler.changeCollectionMode(startCollecting = true, keepCounts = true)
    } catch (t: Throwable) {
      Log.e("ComposeViewDescriptor", "Failed to start tracking recompositions", t)
    }
  }
}
