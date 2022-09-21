/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.core

import android.util.Log
import com.facebook.flipper.plugins.uidebugger.LogTag
import com.facebook.flipper.plugins.uidebugger.descriptors.DescriptorRegister
import com.facebook.flipper.plugins.uidebugger.descriptors.NodeDescriptor
import com.facebook.flipper.plugins.uidebugger.model.Node

class LayoutTraversal(
    private val descriptorRegister: DescriptorRegister,
    val root: ApplicationRef
) {

  @Suppress("unchecked_cast")
  internal fun NodeDescriptor<*>.asAny(): NodeDescriptor<Any> = this as NodeDescriptor<Any>

  /** Traverses the native android hierarchy */
  fun traverse(): List<Node> {

    val result = mutableListOf<Node>()
    val stack = mutableListOf<Any>()
    stack.add(this.root)

    while (stack.isNotEmpty()) {
      val node = stack.removeLast()

      try {
        val descriptor = descriptorRegister.descriptorForClassUnsafe(node::class.java).asAny()
        val children = descriptor.getChildren(node)
        val activeChild = descriptor.getActiveChild(node)

        val childrenIds = mutableListOf<String>()
        children.forEach { child ->
          val childDescriptor =
              descriptorRegister.descriptorForClassUnsafe(child::class.java).asAny()
          // It might make sense one day to remove id from the descriptor since its always the
          // hash code
          childrenIds.add(childDescriptor.getId(child))
          // If there is an active child then don't traverse it
          if (activeChild == null) {
            stack.add(child)
          }
        }

        var activeChildId: String? = null
        if (activeChild != null) {
          stack.add(activeChild)
          activeChildId =
              descriptorRegister.descriptorForClassUnsafe(activeChild.javaClass).getId(activeChild)
        }

        val attributes = descriptor.getData(node)

        val bounds = descriptor.getBounds(node)
        val tags = descriptor.getTags(node)

        result.add(
            Node(
                descriptor.getId(node),
                descriptor.getName(node),
                attributes,
                bounds,
                tags,
                childrenIds,
                activeChildId))
      } catch (exception: Exception) {
        Log.e(LogTag, "Error while processing node ${node.javaClass.name} $node", exception)
      }
    }

    return result
  }
}
