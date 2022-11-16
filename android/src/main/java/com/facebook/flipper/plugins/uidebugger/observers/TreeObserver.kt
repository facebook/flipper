/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.observers

import android.util.Log
import com.facebook.flipper.plugins.uidebugger.LogTag
import com.facebook.flipper.plugins.uidebugger.common.BitmapPool
import com.facebook.flipper.plugins.uidebugger.core.Context
import com.facebook.flipper.plugins.uidebugger.descriptors.Id
import com.facebook.flipper.plugins.uidebugger.descriptors.NodeDescriptor
import com.facebook.flipper.plugins.uidebugger.util.objectIdentity

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
 * The parent is responsible for detecting when a child observer needs to be cleaned up.
 */
abstract class TreeObserver<T> {

  protected val children: MutableMap<Int, TreeObserver<*>> = mutableMapOf()

  abstract val type: String

  abstract fun subscribe(node: Any)

  abstract fun unsubscribe()

  /** Traverses the layout hierarchy while managing any encountered child observers. */
  fun processUpdate(
      context: Context,
      root: Any,
      snapshotBitmap: BitmapPool.ReusableBitmap? = null
  ) {
    val startTimestamp = System.currentTimeMillis()
    val (visitedNodes, observableRoots) = context.layoutTraversal.traverse(root)

    // Add any new observers
    observableRoots.forEach { observable ->
      if (!children.containsKey(observable.objectIdentity())) {
        context.observerFactory.createObserver(observable, context)?.let { observer ->
          Log.d(
              LogTag,
              "Observer ${this.type} discovered new child of type ${observer.type} Node ID ${observable.objectIdentity()}")
          observer.subscribe(observable)
          children[observable.objectIdentity()] = observer
        }
      }
    }

    // Remove any old observers
    val observableRootsIdentifiers = observableRoots.map { it.objectIdentity() }
    val removables = mutableListOf<Id>()
    children.keys.forEach { key ->
      if (!observableRootsIdentifiers.contains(key)) {
        children[key]?.let { observer ->
          Log.d(
              LogTag,
              "Observer ${this.type} cleaning up child of type ${observer.type} Node ID $key")

          observer.cleanUpRecursive()
        }
        removables.add(key)
      }
    }
    removables.forEach { key -> children.remove(key) }

    val traversalCompleteTime = System.currentTimeMillis()

    if (snapshotBitmap != null) {
      @Suppress("unchecked_cast")
      val descriptor =
          context.descriptorRegister.descriptorForClassUnsafe(root::class.java)
              as NodeDescriptor<Any>
      descriptor.getSnapshot(root, snapshotBitmap.bitmap)
    }

    val snapshotCompleteTime = System.currentTimeMillis()

    context.treeObserverManager.enqueueUpdate(
        SubtreeUpdate(
            type,
            root.objectIdentity(),
            visitedNodes,
            startTimestamp,
            traversalCompleteTime,
            snapshotCompleteTime,
            snapshotBitmap))
  }

  fun cleanUpRecursive() {
    Log.i(LogTag, "Cleaning up observer $this")
    children.values.forEach { it.cleanUpRecursive() }
    unsubscribe()
    children.clear()
  }
}
