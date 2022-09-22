/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.observers

import android.util.Log
import com.facebook.flipper.plugins.uidebugger.LogTag
import com.facebook.flipper.plugins.uidebugger.descriptors.DescriptorRegister
import com.facebook.flipper.plugins.uidebugger.descriptors.Id
import com.facebook.flipper.plugins.uidebugger.descriptors.NodeDescriptor
import com.facebook.flipper.plugins.uidebugger.descriptors.nodeId
import com.facebook.flipper.plugins.uidebugger.model.Node

/**
 * This will traverse the layout hierarchy until it sees a node that has an observer registered for
 * it. The first item in the pair is the visited nodes The second item are any observable roots
 * discovered
 */
class PartialLayoutTraversal(
    private val descriptorRegister: DescriptorRegister,
    private val treeObserverFactory: TreeObserverFactory,
) {

  @Suppress("unchecked_cast")
  internal fun NodeDescriptor<*>.asAny(): NodeDescriptor<Any> = this as NodeDescriptor<Any>

  fun traverse(root: Any): Pair<MutableList<Node>, List<Any>> {

    val visited = mutableListOf<Node>()
    val observableRoots = mutableListOf<Any>()
    val stack = mutableListOf<Any>()
    stack.add(root)

    while (stack.isNotEmpty()) {

      val node = stack.removeLast()

      try {
        // If we encounter a node that has it own observer, don't traverse
        if (node != root && treeObserverFactory.hasObserverFor(node)) {
          observableRoots.add(node)
          continue
        }

        val descriptor = descriptorRegister.descriptorForClassUnsafe(node::class.java).asAny()

        val children = descriptor.getChildren(node)

        val childrenIds = mutableListOf<Id>()
        val activeChild = descriptor.getActiveChild(node)

        for (child in children) {
          // It might make sense one day to remove id from the descriptor since its always the
          // hash code
          val childDescriptor =
              descriptorRegister.descriptorForClassUnsafe(child::class.java).asAny()
          childrenIds.add(child.nodeId())
          // If there is an active child then don't traverse it
          if (activeChild == null) {
            stack.add(child)
          }
        }
        var activeChildId: Id? = null
        if (activeChild != null) {
          stack.add(activeChild)
          activeChildId = activeChild.nodeId()
        }

        val attributes = descriptor.getData(node)
        val bounds = descriptor.getBounds(node)
        val tags = descriptor.getTags(node)

        visited.add(
            Node(
                node.nodeId(),
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

    return Pair(visited, observableRoots)
  }
}
