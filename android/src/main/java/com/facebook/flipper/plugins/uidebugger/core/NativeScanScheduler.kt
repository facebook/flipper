/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.core

import android.os.Looper
import android.util.Log
import com.facebook.flipper.plugins.uidebugger.model.NativeScanEvent
import com.facebook.flipper.plugins.uidebugger.model.Node
import com.facebook.flipper.plugins.uidebugger.model.PerfStatsEvent
import com.facebook.flipper.plugins.uidebugger.scheduler.Scheduler
import kotlinx.serialization.json.Json

data class ScanResult(
    val txId: Long,
    val scanStart: Long,
    val scanEnd: Long,
    val nodes: List<Node>
)

class NativeScanScheduler(val context: Context) : Scheduler.Task<ScanResult> {
  val traversal = LayoutTraversal(context.descriptorRegister, context.applicationRef)
  var txId = 0L
  override fun execute(): ScanResult {

    val start = System.currentTimeMillis()
    val nodes = traversal.traverse()
    val scanEnd = System.currentTimeMillis()

    Log.d(
        "LAYOUT_SCHEDULER",
        "${Thread.currentThread().name}${Looper.myLooper()} produced: ${nodes.count()} nodes")

    return ScanResult(txId++, start, scanEnd, nodes)
  }

  override fun process(result: ScanResult) {

    val serialized =
        Json.encodeToString(
            NativeScanEvent.serializer(), NativeScanEvent(result.txId, result.nodes))
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
                result.txId,
                result.scanStart,
                result.scanEnd,
                result.scanEnd,
                serializationEnd,
                socketEnd,
                result.nodes.size)))
  }
}
