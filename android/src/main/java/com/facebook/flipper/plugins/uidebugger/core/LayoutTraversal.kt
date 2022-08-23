/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.core

import com.facebook.flipper.plugins.uidebugger.common.Node
import com.facebook.flipper.plugins.uidebugger.descriptors.Descriptor
import com.facebook.flipper.plugins.uidebugger.descriptors.DescriptorRegister
import java.lang.ref.WeakReference

class LayoutTraversal(private val descriptorRegister: DescriptorRegister) {
  class IntermediateNode(val node: Node) {
    var children: List<Any>? = null
  }

  internal inline fun Descriptor<*>.asAny(): Descriptor<Any> = this as Descriptor<Any>

  private fun describe(obj: Any): IntermediateNode {
    var intermediate = IntermediateNode(Node(WeakReference(obj)))

    val descriptor = descriptorRegister.descriptorForClass(obj::class.java)
    descriptor?.let { descriptor ->
      val anyDescriptor = descriptor.asAny()

      intermediate.node.id = anyDescriptor.getId(obj)
      intermediate.node.name = anyDescriptor.getName(obj)

      val attributes = mutableMapOf<String, Any?>()
      anyDescriptor.getData(obj, attributes)
      intermediate.node.attributes = attributes

      val children = mutableListOf<Any>()
      anyDescriptor.getChildren(obj, children)
      intermediate.children = children
    }

    return intermediate
  }

  private fun traverse(entry: Any): Node? {
    val root = describe(entry)
    root?.let { intermediate ->
      val queue = mutableListOf<IntermediateNode>()
      queue.add(intermediate)

      while (queue.isNotEmpty()) {
        val intermediateNode = queue.removeFirst()

        val children = mutableListOf<Node>()
        intermediateNode.children?.forEach {
          val intermediateChild = describe(it)
          children.add(intermediateChild.node)
          queue.add(intermediateChild)
        }
        intermediateNode.node.children = children
      }
    }

    return root?.node
  }

  fun inspect(applicationRef: ApplicationRef): Node? {
    return traverse(applicationRef)
  }
}
