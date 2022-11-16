/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.core

import android.os.Looper
import android.util.Log
import com.facebook.flipper.plugins.uidebugger.LogTag
import com.facebook.flipper.plugins.uidebugger.descriptors.MetadataRegister
import com.facebook.flipper.plugins.uidebugger.descriptors.nodeId
import com.facebook.flipper.plugins.uidebugger.model.MetadataUpdateEvent
import com.facebook.flipper.plugins.uidebugger.model.Node
import com.facebook.flipper.plugins.uidebugger.model.PerfStatsEvent
import com.facebook.flipper.plugins.uidebugger.model.SubtreeUpdateEvent
import com.facebook.flipper.plugins.uidebugger.observers.TreeObserverFactory
import com.facebook.flipper.plugins.uidebugger.scheduler.Scheduler
import com.facebook.flipper.plugins.uidebugger.traversal.PartialLayoutTraversal
import kotlinx.serialization.json.Json

data class ScanResult(
    val txId: Long,
    val scanStart: Long,
    val scanEnd: Long,
    val nodes: List<Node>
)

const val observerType = "FullScan"

/** This is used to stress test the ui debugger, should not be used in production */
class NativeScanScheduler(val context: Context) : Scheduler.Task<ScanResult> {
  /**
   * when you supply no observers the traversal will never halt and will effectively scan the entire
   * hierarchy
   */
  private val emptyObserverFactory = TreeObserverFactory()
  private val traversal = PartialLayoutTraversal(context.descriptorRegister, emptyObserverFactory)
  private var txId = 100000L

  override fun execute(): ScanResult {
    val start = System.currentTimeMillis()
    val (nodes) = traversal.traverse(context.applicationRef)
    val scanEnd = System.currentTimeMillis()

    Log.d(
        LogTag,
        "${Thread.currentThread().name}${Looper.myLooper()} produced: ${nodes.count()} nodes")

    return ScanResult(txId++, start, scanEnd, nodes)
  }

  private fun sendMetadata() {
    val metadata = MetadataRegister.dynamicMetadata()
    if (metadata.size > 0) {
      context.connectionRef.connection?.send(
          MetadataUpdateEvent.name,
          Json.encodeToString(MetadataUpdateEvent.serializer(), MetadataUpdateEvent(metadata)))
    }
  }

  private fun sendSubtreeUpdate(input: ScanResult) {
    val serialized =
        Json.encodeToString(
            SubtreeUpdateEvent.serializer(),
            SubtreeUpdateEvent(
                input.txId, observerType, context.applicationRef.nodeId(), input.nodes))
    val serializationEnd = System.currentTimeMillis()

    context.connectionRef.connection?.send(
        SubtreeUpdateEvent.name,
        serialized,
    )
    val socketEnd = System.currentTimeMillis()

    context.connectionRef.connection?.send(
        PerfStatsEvent.name,
        Json.encodeToString(
            PerfStatsEvent.serializer(),
            PerfStatsEvent(
                input.txId,
                observerType,
                input.scanStart,
                input.scanStart,
                input.scanEnd,
                input.scanEnd,
                serializationEnd,
                socketEnd,
                input.nodes.size)))
  }

  override fun process(input: ScanResult) {
    sendMetadata()
    sendSubtreeUpdate(input)
  }
}
