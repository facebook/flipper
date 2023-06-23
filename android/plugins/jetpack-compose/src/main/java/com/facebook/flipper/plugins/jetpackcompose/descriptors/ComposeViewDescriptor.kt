// (c) Meta Platforms, Inc. and affiliates. Confidential and proprietary.

package com.facebook.flipper.plugins.jetpackcompose.descriptors

import android.os.Build
import android.view.View
import androidx.compose.ui.platform.ComposeView
import com.facebook.flipper.plugins.jetpackcompose.model.ComposeNode
import com.facebook.flipper.plugins.uidebugger.descriptors.ChainedDescriptor
import facebook.internal.androidx.compose.ui.inspection.inspector.InspectorNode
import facebook.internal.androidx.compose.ui.inspection.inspector.LayoutInspectorTree

object ComposeViewDescriptor : ChainedDescriptor<ComposeView>() {
  override fun onGetName(node: ComposeView): String = node.javaClass.simpleName

  private fun transform(view: View, nodes: List<InspectorNode>): List<ComposeNode> {
    val positionOnScreen = IntArray(2)
    view.getLocationOnScreen(positionOnScreen)

    val xOffset = positionOnScreen[0]
    val yOffset = positionOnScreen[1]

    return nodes.map { node -> ComposeNode(view, node, xOffset, yOffset) }
  }

  override fun onGetChildren(node: ComposeView): List<Any> {
    val children = mutableListOf<Any>()
    val count = node.childCount - 1
    for (i in 0..count) {
      val child: View = node.getChildAt(i)
      children.add(child)

      if (child.javaClass.simpleName.contains("AndroidComposeView") &&
          (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q)) {
        val layoutInspector = LayoutInspectorTree()
        layoutInspector.hideSystemNodes = false
        return transform(child, layoutInspector.convert(child))
      }
    }

    return children
  }
}
