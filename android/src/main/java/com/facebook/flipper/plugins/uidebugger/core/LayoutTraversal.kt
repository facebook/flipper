/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.core

import android.util.Log
import com.facebook.flipper.plugins.uidebugger.LogTag
import com.facebook.flipper.plugins.uidebugger.common.InspectableObject
import com.facebook.flipper.plugins.uidebugger.descriptors.Descriptor
import com.facebook.flipper.plugins.uidebugger.descriptors.DescriptorRegister
import com.facebook.flipper.plugins.uidebugger.model.Node

class LayoutTraversal(
    private val descriptorRegister: DescriptorRegister,
    val root: ApplicationRef
) {

  internal inline fun Descriptor<*>.asAny(): Descriptor<Any> = this as Descriptor<Any>

  /** Traverses the native android hierarchy */
  fun traverse(): List<Node> {

    val result = mutableListOf<Node>()
    val stack = mutableListOf<Any>()
    stack.add(this.root)

    while (stack.isNotEmpty()) {

      val node = stack.removeLast()

      try {

        val descriptor = descriptorRegister.descriptorForClassUnsafe(node::class.java).asAny()

        val children = mutableListOf<Any>()
        descriptor.getChildren(node, children)

        val childrenIds = mutableListOf<String>()
        for (child in children) {
          // it might make sense one day to remove id from the descriptor since its always the
          // hash code
          val childDescriptor =
              descriptorRegister.descriptorForClassUnsafe(child::class.java).asAny()
          childrenIds.add(childDescriptor.getId(child))
          stack.add(child)
        }

        val attributes = mutableMapOf<String, InspectableObject>()
        descriptor.getData(node, attributes)

        result.add(Node(descriptor.getId(node), descriptor.getName(node), attributes, childrenIds))
      } catch (exception: Exception) {
        Log.e(LogTag, "Error while processing node ${node.javaClass.name} ${node} ", exception)
      }
    }

    return result
  }
}
