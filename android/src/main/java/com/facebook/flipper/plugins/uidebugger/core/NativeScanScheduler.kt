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
import com.facebook.flipper.plugins.uidebugger.model.NativeScanEvent
import com.facebook.flipper.plugins.uidebugger.model.Node
import com.facebook.flipper.plugins.uidebugger.model.PerfStatsEvent
import com.facebook.flipper.plugins.uidebugger.observers.PartialLayoutTraversal
import com.facebook.flipper.plugins.uidebugger.observers.TreeObserverFactory
import com.facebook.flipper.plugins.uidebugger.scheduler.Scheduler
import kotlinx.serialization.json.Json

data class ScanResult(
    val txId: Long,
    val scanStart: Long,
    val scanEnd: Long,
    val nodes: List<Node>
)

/** This is used to stress test the ui debugger, should not be used in production */
class NativeScanScheduler(val context: Context) : Scheduler.Task<ScanResult> {
  /**
   * when you supply no observers the traversal will never halt and will effectively scan the entire
   * hierarchy
   */
  private val emptyObserverFactory = TreeObserverFactory()
  private val traversal = PartialLayoutTraversal(context.descriptorRegister, emptyObserverFactory)
  private var txId = 0L

  override fun execute(): ScanResult {
    val start = System.currentTimeMillis()
    val (nodes) = traversal.traverse(context.applicationRef)
    val scanEnd = System.currentTimeMillis()

    Log.d(
        LogTag,
        "${Thread.currentThread().name}${Looper.myLooper()} produced: ${nodes.count()} nodes")

    return ScanResult(txId++, start, scanEnd, nodes)
  }

  override fun process(input: ScanResult) {
    val serialized =
        Json.encodeToString(NativeScanEvent.serializer(), NativeScanEvent(input.txId, input.nodes))
    val serializationEnd = System.currentTimeMillis()

    context.connectionRef.connection?.send(
        NativeScanEvent.name,
        serialized,
    )
    val socketEnd = System.currentTimeMillis()

    context.connectionRef.connection?.send(
        PerfStatsEvent.name,
        Json.encodeToString(
            PerfStatsEvent.serializer(),
            PerfStatsEvent(
                input.txId,
                "FullScan",
                input.scanStart,
                input.scanEnd,
                input.scanEnd,
                serializationEnd,
                socketEnd,
                input.nodes.size)))
  }
}
