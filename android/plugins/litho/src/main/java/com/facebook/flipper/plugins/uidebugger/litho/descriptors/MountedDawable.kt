/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.litho.descriptors

import android.graphics.Bitmap
import com.facebook.flipper.plugins.uidebugger.descriptors.*
import com.facebook.flipper.plugins.uidebugger.model.Bounds
import com.facebook.flipper.plugins.uidebugger.model.InspectableObject
import com.facebook.flipper.plugins.uidebugger.model.MetadataId

/** a drawable or view that is mounted, along with the correct descriptor */
class MountedObject(val obj: Any, val descriptor: NodeDescriptor<Any>)

object MountedObjectDescriptor : NodeDescriptor<MountedObject> {

  override fun getBounds(node: MountedObject): Bounds? {
    val bounds = node.descriptor.getBounds(node.obj)
    bounds?.let { b ->
      /**
       * When we ask android for the bounds the x,y offset is w.r.t to the nearest android parent
       * view group. From UI debuggers perspective using the raw android offset will double the
       * total offset of this native view as the offset is included by the litho components between
       * the mounted view and its native parent
       */
      return Bounds(0, 0, b.width, b.height)
    }
    return null
  }

  override fun getName(node: MountedObject): String = node.descriptor.getName(node.obj)

  override fun getChildren(node: MountedObject): List<Any> = node.descriptor.getChildren(node.obj)

  override fun getActiveChild(node: MountedObject): Any? = node.descriptor.getActiveChild(node.obj)

  override fun getData(node: MountedObject): Map<MetadataId, InspectableObject> =
      node.descriptor.getData(node.obj)

  override fun getTags(node: MountedObject): Set<String> = node.descriptor.getTags(node.obj)

  override fun getSnapshot(node: MountedObject, bitmap: Bitmap?): Bitmap? =
      node.descriptor.getSnapshot(node.obj, bitmap)
}
