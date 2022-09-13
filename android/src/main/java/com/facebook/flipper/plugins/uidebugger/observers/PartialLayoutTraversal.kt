/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.observers

import android.util.Log
import com.facebook.flipper.plugins.uidebugger.LogTag
import com.facebook.flipper.plugins.uidebugger.common.InspectableObject
import com.facebook.flipper.plugins.uidebugger.descriptors.Descriptor
import com.facebook.flipper.plugins.uidebugger.descriptors.DescriptorRegister
import com.facebook.flipper.plugins.uidebugger.model.Node

/**
 * This will traverse the layout hierarchy untill it sees a node that has an observer registered for
 * it. The first item in the pair is the visited nodes The second item are any observable roots
 * discovered
 */
class PartialLayoutTraversal(
    private val descriptorRegister: DescriptorRegister,
    private val treeObserverfactory: TreeObserverFactory,
) {

  internal fun Descriptor<*>.asAny(): Descriptor<Any> = this as Descriptor<Any>

  fun traverse(root: Any): Pair<MutableList<Node>, List<Any>> {

    val visited = mutableListOf<Node>()
    val observableRoots = mutableListOf<Any>()
    val stack = mutableListOf<Any>()
    stack.add(root)

    while (stack.isNotEmpty()) {

      val node = stack.removeLast()

      try {

        // if we encounter a node that has it own observer, dont traverse
        if (node != root && treeObserverfactory.hasObserverFor(node)) {
          observableRoots.add(node)
          continue
        }

        val descriptor = descriptorRegister.descriptorForClassUnsafe(node::class.java).asAny()

        val children = mutableListOf<Any>()
        descriptor.getChildren(node, children)

        val childrenIds = mutableListOf<String>()
        val activeChild = descriptor.getActiveChild(node)

        for (child in children) {
          // it might make sense one day to remove id from the descriptor since its always the
          // hash code
          val childDescriptor =
              descriptorRegister.descriptorForClassUnsafe(child::class.java).asAny()
          childrenIds.add(childDescriptor.getId(child))
          // if there is an active child then dont traverse it
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

        val attributes = mutableMapOf<String, InspectableObject>()
        descriptor.getData(node, attributes)

        visited.add(
            Node(
                descriptor.getId(node),
                descriptor.getName(node),
                attributes,
                childrenIds,
                activeChildId))
      } catch (exception: Exception) {
        Log.e(LogTag, "Error while processing node ${node.javaClass.name} ${node} ", exception)
      }
    }

    return Pair(visited, observableRoots)
  }
}
