/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger

import android.util.Log
import com.facebook.flipper.plugins.uidebugger.common.InspectableObject
import com.facebook.flipper.plugins.uidebugger.core.Context
import com.facebook.flipper.plugins.uidebugger.descriptors.Descriptor
import com.facebook.flipper.plugins.uidebugger.descriptors.DescriptorRegister
import com.facebook.flipper.plugins.uidebugger.model.Node
import com.facebook.flipper.plugins.uidebugger.model.PerfStatsEvent
import com.facebook.flipper.plugins.uidebugger.model.SubtreeUpdateEvent
import com.facebook.flipper.plugins.uidebugger.observers.ApplicationTreeObserver
import com.facebook.flipper.plugins.uidebugger.observers.TreeObserverFactory
import java.util.concurrent.atomic.AtomicInteger
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
import kotlinx.serialization.json.Json

data class SubtreeUpdate(
    val observerType: String,
    val nodes: List<Node>,
    val startTime: Long,
    val traversalCompleteTime: Long
)

/** Holds the instances of Tree observers */
class TreeObserverManager(val context: Context) {

  private val rootObserver = ApplicationTreeObserver(context)
  private val treeUpdates = Channel<SubtreeUpdate>(Channel.UNLIMITED)
  private val workerScope = CoroutineScope(Dispatchers.IO)
  private val txId = AtomicInteger()

  fun emit(update: SubtreeUpdate) {
    treeUpdates.trySend(update)
  }

  /**
   * 1. Sets up the root observer
   * 2. Starts worker to listen to channel, which serializers and sends data over connection
   */
  fun start() {

    rootObserver.subscribe(context.applicationRef)

    workerScope.launch {
      while (isActive) {
        try {

          val observation = treeUpdates.receive()

          val onWorkerThread = System.currentTimeMillis()

          val txId = txId.getAndIncrement().toLong()
          val serialized =
              Json.encodeToString(
                  SubtreeUpdateEvent.serializer(),
                  SubtreeUpdateEvent(txId, observation.observerType, observation.nodes))

          val serializationEnd = System.currentTimeMillis()

          context.connectionRef.connection?.send(SubtreeUpdateEvent.name, serialized)
          val socketEnd = System.currentTimeMillis()
          Log.i(
              LogTag, "Sent event for ${observation.observerType} nodes ${observation.nodes.size}")

          val perfStats =
              PerfStatsEvent(
                  txId = txId,
                  start = observation.startTime,
                  traversalComplete = observation.traversalCompleteTime,
                  queuingComplete = onWorkerThread,
                  serializationComplete = serializationEnd,
                  socketComplete = socketEnd,
                  nodesCount = observation.nodes.size)
          context.connectionRef.connection?.send(
              PerfStatsEvent.name, Json.encodeToString(PerfStatsEvent.serializer(), perfStats))
        } catch (e: java.lang.Exception) {
          Log.e(LogTag, "Error in channel ", e)
        }
      }

      Log.i(LogTag, "shutting down worker")
    }
  }

  fun stop() {
    rootObserver.cleanUpRecursive()
    treeUpdates.close()
    workerScope.cancel()
  }
}

/*
Stateful class that manages some subtree in the UI Hierarchy.
It is responsible for:
 1. listening to the relevant framework events
 2. Traversing the hierarchy of the managed nodes
 3. Diffing to previous state (optional)
 4. Pushing out updates for its entire set of nodes

 If while traversing it encounters a node type which has its own TreeObserver, it
 does not traverse that, instead it sets up a Tree observer responsible for that subtree

 The parent is responsible for detecting when a child observer needs to be cleaned up
*/
abstract class TreeObserver<T> {

  protected val children: MutableMap<Int, TreeObserver<*>> = mutableMapOf()

  // todo try to pass T again?
  abstract fun subscribe(node: Any)

  abstract fun unsubscribe()

  fun cleanUpRecursive() {
    children.values.forEach { it.cleanUpRecursive() }
    unsubscribe()
    children.clear()
  }
}

typealias HashCode = Int

fun Any.identityHashCode(): HashCode {
  return System.identityHashCode(this)
}

class PartialLayoutTraversal(
    private val descriptorRegister: DescriptorRegister,
    private val treeObserverfactory: TreeObserverFactory,
) {

  internal fun Descriptor<*>.asAny(): Descriptor<Any> = this as Descriptor<Any>

  fun traverse(root: Any): Pair<MutableList<Node>, List<Any>> {

    val visited = mutableListOf<Node>()
    val skipped = mutableListOf<Any>()
    val stack = mutableListOf<Any>()
    stack.add(root)

    while (stack.isNotEmpty()) {

      val node = stack.removeLast()

      try {

        // if we encounter a node that has it own observer, dont traverse
        if (node != root && treeObserverfactory.hasObserverFor(node)) {
          skipped.add(node)
          continue
        }

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

        // NOTE active child null here
        visited.add(
            Node(descriptor.getId(node), descriptor.getName(node), attributes, childrenIds, null))
      } catch (exception: Exception) {
        Log.e(LogTag, "Error while processing node ${node.javaClass.name} ${node} ", exception)
      }
    }

    return Pair(visited, skipped)
  }
}
