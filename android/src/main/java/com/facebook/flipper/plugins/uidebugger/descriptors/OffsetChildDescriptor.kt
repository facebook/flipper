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
import com.facebook.flipper.plugins.uidebugger.util.MaybeDeferred

/** a drawable or view that is mounted, along with the correct descriptor */
class OffsetChild(val child: Any, val descriptor: NodeDescriptor<Any>, val x: Int, val y: Int) {
  companion object {
    fun zero(child: Any, descriptor: NodeDescriptor<Any>) = OffsetChild(child, descriptor, 0, 0)
  }
}

object OffsetChildDescriptor : NodeDescriptor<OffsetChild> {

  override fun getId(node: OffsetChild): Id = node.descriptor.getId(node.child)

  override fun getBounds(node: OffsetChild): Bounds {
    val bounds = node.descriptor.getBounds(node.child)
    return Bounds(node.x, node.y, bounds.width, bounds.height)
  }

  override fun getName(node: OffsetChild): String = node.descriptor.getName(node.child)

  override fun getQualifiedName(node: OffsetChild): String =
      node.descriptor.getQualifiedName(node.child)

  override fun getChildren(node: OffsetChild): List<Any> = node.descriptor.getChildren(node.child)

  override fun getActiveChild(node: OffsetChild): Any? = node.descriptor.getActiveChild(node.child)

  override fun getAttributes(node: OffsetChild): MaybeDeferred<Map<MetadataId, InspectableObject>> =
      node.descriptor.getAttributes(node.child)

  override fun getTags(node: OffsetChild): Set<String> = node.descriptor.getTags(node.child)
  override fun getSnapshot(node: OffsetChild, bitmap: Bitmap?): Bitmap? =
      node.descriptor.getSnapshot(node.child, bitmap)
}
