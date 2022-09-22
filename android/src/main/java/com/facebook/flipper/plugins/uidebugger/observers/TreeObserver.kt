/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.observers

import android.util.Log
import com.facebook.flipper.plugins.uidebugger.LogTag
import com.facebook.flipper.plugins.uidebugger.core.Context
import com.facebook.flipper.plugins.uidebugger.descriptors.nodeId

/*
 * Represents a stateful observer that manages some subtree in the UI Hierarchy.
 * It is responsible for:
 *  1. Listening to the relevant framework events
 *  2. Traversing the hierarchy of the managed nodes
 *  3. Diffing to previous state (optional)
 *  4. Pushing out updates for its entire set of managed nodes
 *
 * If while traversing it encounters a node type which has its own TreeObserver, it
 * does not traverse that, instead it sets up a Tree observer responsible for that subtree
 *
 * The parent is responsible for detecting when a child observer needs to be cleaned up
 */
abstract class TreeObserver<T> {

  protected val children: MutableMap<Int, TreeObserver<*>> = mutableMapOf()

  abstract val type: String

  abstract fun subscribe(node: Any)

  abstract fun unsubscribe()

  /**
   * Optional helper method that traverses the layout hierarchy while managing any encountered child
   * observers correctly
   */
  fun traverseAndSend(context: Context, root: Any) {
    val start = System.currentTimeMillis()
    val (visitedNodes, observerRootsNodes) = context.layoutTraversal.traverse(root)

    // Add any new observers
    for (observerRoot in observerRootsNodes) {
      if (!children.containsKey(observerRoot.nodeId())) {
        context.observerFactory.createObserver(observerRoot, context)?.let { childObserver ->
          Log.d(
              LogTag,
              "Observer ${this.type} discovered new child of type ${childObserver.type} Node ID ${observerRoot.nodeId()}")
          childObserver.subscribe(observerRoot)
          children[observerRoot.nodeId()] = childObserver
        }
      }
    }

    // Remove any old observers
    val observerRootIds = observerRootsNodes.map { it.nodeId() }
    for (childKey in children.keys) {
      if (!observerRootIds.contains(childKey)) {
        children[childKey]?.let { childObserver ->
          Log.d(
              LogTag,
              "Observer ${this.type} cleaning up child of type ${childObserver.type} Node ID $childKey")

          childObserver.cleanUpRecursive()
        }
      }
    }

    Log.d(LogTag, "For Observer ${this.type} Sending ${visitedNodes.size}")
    context.treeObserverManager.send(
        SubtreeUpdate(type, visitedNodes, start, System.currentTimeMillis()))
  }

  fun cleanUpRecursive() {
    Log.i(LogTag, "Cleaning up observer $this")
    children.values.forEach { it.cleanUpRecursive() }
    unsubscribe()
    children.clear()
  }
}
