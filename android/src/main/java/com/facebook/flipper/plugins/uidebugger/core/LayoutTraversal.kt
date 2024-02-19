/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.core

import android.util.Log
import com.facebook.flipper.plugins.uidebugger.LogTag
import com.facebook.flipper.plugins.uidebugger.descriptors.Id
import com.facebook.flipper.plugins.uidebugger.descriptors.NodeDescriptor
import com.facebook.flipper.plugins.uidebugger.model.Node
import com.facebook.flipper.plugins.uidebugger.model.TraversalError
import com.facebook.flipper.plugins.uidebugger.util.Immediate
import com.facebook.flipper.plugins.uidebugger.util.MaybeDeferred

/**
 * This will traverse the layout hierarchy until it sees a node that has an observer registered for
 * it.
 * - The first item in the pair is the visited nodes.
 * - The second item are any observable roots discovered.
 */
class LayoutTraversal(
    private val context: UIDContext,
) {

  @Suppress("unchecked_cast")
  private fun NodeDescriptor<*>.asAny(): NodeDescriptor<Any> = this as NodeDescriptor<Any>

  fun traverse(root: Any): MutableList<MaybeDeferred<Node>> {

    val visited = mutableListOf<MaybeDeferred<Node>>()

    // cur and parent Id
    val stack = mutableListOf<Pair<Any, Id?>>()
    stack.add(Pair(root, null))

    val shallow = mutableSetOf<Any>()

    while (stack.isNotEmpty()) {
      val (node, parentId) = stack.removeLast()

      try {

        val descriptor =
            context.descriptorRegister.descriptorForClassUnsafe(node::class.java).asAny()

        val curId = descriptor.getId(node)
        if (shallow.contains(node)) {
          visited.add(
              Immediate(
                  Node(
                      curId,
                      parentId,
                      descriptor.getQualifiedName(node),
                      descriptor.getName(node),
                      descriptor.getBoxData(node),
                      emptyMap(),
                      emptyMap(),
                      null,
                      descriptor.getBounds(node),
                      emptySet(),
                      emptyList(),
                      null)))

          shallow.remove(node)
          continue
        }

        val children = descriptor.getChildren(node)

        val activeChild = descriptor.getActiveChild(node)

        var activeChildId: Id? = null
        if (activeChild != null) {
          val activeChildDescriptor =
              context.descriptorRegister.descriptorForClassUnsafe(activeChild.javaClass)
          activeChildId = activeChildDescriptor.getId(activeChild)
        }

        val childrenIds = mutableListOf<Id>()
        children.forEach { child ->
          val childDescriptor = context.descriptorRegister.descriptorForClassUnsafe(child.javaClass)
          childrenIds.add(childDescriptor.getId(child))
          stack.add(Pair(child, curId))
          // If there is an active child then don't traverse it
          if (activeChild != null && activeChild != child) {
            shallow.add(child)
          }
        }

        val attributes = descriptor.getAttributes(node)
        val bounds = descriptor.getBounds(node)
        val tags = descriptor.getTags(node)
        visited.add(
            attributes.map { attrs ->
              Node(
                  curId,
                  parentId,
                  descriptor.getQualifiedName(node),
                  descriptor.getName(node),
                  descriptor.getBoxData(node),
                  attrs,
                  descriptor.getInlineAttributes(node),
                  descriptor.getHiddenAttributes(node),
                  bounds,
                  tags,
                  childrenIds,
                  activeChildId)
            })
      } catch (exception: Exception) {
        Log.e(LogTag, "Error while processing node ${node.javaClass.name} $node", exception)
        context.onError(
            TraversalError(
                node.javaClass.simpleName,
                exception.javaClass.simpleName,
                exception.message ?: "",
                exception.stackTraceToString()))
      }
    }

    return visited
  }
}
