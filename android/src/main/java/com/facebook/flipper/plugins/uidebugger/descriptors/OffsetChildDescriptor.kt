/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

import android.graphics.Bitmap
import com.facebook.flipper.plugins.uidebugger.model.Bounds
import com.facebook.flipper.plugins.uidebugger.model.InspectableObject
import com.facebook.flipper.plugins.uidebugger.model.MetadataId

/** a drawable or view that is mounted, along with the correct descriptor */
class OffsetChild(val child: Any, val descriptor: NodeDescriptor<Any>, val x: Int, val y: Int) {
  companion object {
    fun zero(child: Any, descriptor: NodeDescriptor<Any>) = OffsetChild(child, descriptor, 0, 0)
  }
}

object OffsetChildDescriptor : NodeDescriptor<OffsetChild> {

  override fun getBounds(node: OffsetChild): Bounds? {
    val bounds = node.descriptor.getBounds(node.child)
    bounds?.let { b ->
      return Bounds(node.x, node.y, b.width, b.height)
    }
    return null
  }

  override fun getName(node: OffsetChild): String = node.descriptor.getName(node.child)

  override fun getChildren(node: OffsetChild): List<Any> = node.descriptor.getChildren(node.child)

  override fun getActiveChild(node: OffsetChild): Any? = node.descriptor.getActiveChild(node.child)

  override fun getData(node: OffsetChild): Map<MetadataId, InspectableObject> =
      node.descriptor.getData(node.child)

  override fun getTags(node: OffsetChild): Set<String> = node.descriptor.getTags(node.child)
  override fun getSnapshot(node: OffsetChild, bitmap: Bitmap?): Bitmap? =
      node.descriptor.getSnapshot(node.child, bitmap)
}
