// (c) Meta Platforms, Inc. and affiliates. Confidential and proprietary.

package com.facebook.flipper.plugins.jetpackcompose.descriptors

import android.graphics.Bitmap
import android.view.ViewGroup
import com.facebook.flipper.plugins.jetpackcompose.model.ComposeInnerViewNode
import com.facebook.flipper.plugins.uidebugger.descriptors.NodeDescriptor
import com.facebook.flipper.plugins.uidebugger.descriptors.ViewDescriptor
import com.facebook.flipper.plugins.uidebugger.descriptors.ViewGroupDescriptor
import com.facebook.flipper.plugins.uidebugger.model.Bounds
import com.facebook.flipper.plugins.uidebugger.model.InspectableObject
import com.facebook.flipper.plugins.uidebugger.model.MetadataId
import com.facebook.flipper.plugins.uidebugger.util.MaybeDeferred

object ComposeInnerViewDescriptor : NodeDescriptor<ComposeInnerViewNode> {

  override fun getBounds(node: ComposeInnerViewNode): Bounds {
    return node.bounds
  }

  override fun getName(node: ComposeInnerViewNode): String {
    if (node.view is ViewGroup) {
      return ViewGroupDescriptor.getName(node.view)
    }
    return ViewDescriptor.getName(node.view)
  }

  override fun getQualifiedName(node: ComposeInnerViewNode): String {
    if (node.view is ViewGroup) {
      return ViewGroupDescriptor.getQualifiedName(node.view)
    }
    return ViewDescriptor.getQualifiedName(node.view)
  }

  override fun getChildren(node: ComposeInnerViewNode): List<Any> {
    if (node.view is ViewGroup) {
      return ViewGroupDescriptor.getChildren(node.view)
    }
    return ViewDescriptor.getChildren(node.view)
  }

  override fun getSnapshot(node: ComposeInnerViewNode, bitmap: Bitmap?): Bitmap? {
    if (node.view is ViewGroup) {
      return ViewGroupDescriptor.getSnapshot(node.view, bitmap)
    }
    return ViewDescriptor.getSnapshot(node.view, bitmap)
  }

  override fun getActiveChild(node: ComposeInnerViewNode): Any? {
    if (node.view is ViewGroup) {
      return ViewGroupDescriptor.getActiveChild(node.view)
    }
    return ViewDescriptor.getActiveChild(node.view)
  }

  override fun getAttributes(
      node: ComposeInnerViewNode
  ): MaybeDeferred<Map<MetadataId, InspectableObject>> {
    if (node.view is ViewGroup) {
      return ViewGroupDescriptor.getAttributes(node.view)
    }
    return ViewDescriptor.getAttributes(node.view)
  }

  override fun getTags(node: ComposeInnerViewNode): Set<String> {
    if (node.view is ViewGroup) {
      return ViewGroupDescriptor.getTags(node.view)
    }
    return ViewDescriptor.getTags(node.view)
  }
}
