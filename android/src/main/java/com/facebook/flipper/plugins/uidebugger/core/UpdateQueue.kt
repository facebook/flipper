/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.core

import android.annotation.SuppressLint
import android.graphics.Bitmap
import android.util.Base64
import android.util.Base64OutputStream
import android.util.Log
import com.facebook.flipper.plugins.uidebugger.LogTag
import com.facebook.flipper.plugins.uidebugger.descriptors.Id
import com.facebook.flipper.plugins.uidebugger.descriptors.MetadataRegister
import com.facebook.flipper.plugins.uidebugger.model.FrameScanEvent
import com.facebook.flipper.plugins.uidebugger.model.MetadataUpdateEvent
import com.facebook.flipper.plugins.uidebugger.model.Node
import com.facebook.flipper.plugins.uidebugger.model.PerfStatsEvent
import com.facebook.flipper.plugins.uidebugger.model.Snapshot
import com.facebook.flipper.plugins.uidebugger.model.TraversalError
import com.facebook.flipper.plugins.uidebugger.util.MaybeDeferred
import com.facebook.flipper.plugins.uidebugger.util.StopWatch
import java.io.ByteArrayOutputStream
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.channels.Channel.Factory.CONFLATED
import kotlinx.serialization.json.Json

data class Update(
    val snapshotNode: Id,
    val deferredNodes: List<MaybeDeferred<Node>>,
    val startTimestamp: Long,
    val traversalMS: Long,
    val snapshotMS: Long,
    val queuedTimestamp: Long,
    val snapshotBitmap: BitmapPool.ReusableBitmap?
)

/**
 * Holds an update and manages a coroutine which serially reads from queue and sends to flipper
 * desktop
 */
class UpdateQueue(val context: UIDContext) {

  // conflated channel means we only hold 1 item and newer values override older ones,
  // there is no point processing frames that the desktop cant keep up with since we only display
  // the latest
  private val frameChannel = Channel<Update>(CONFLATED)

  private var job: Job? = null
  private val workerScope = CoroutineScope(Dispatchers.IO)
  private val stopWatch = StopWatch()

  fun enqueueUpdate(update: Update) {
    frameChannel.trySend(update)
  }

  /**
   * 1. Sets up the root observer
   * 2. Starts worker to listen to channel, which serializers and sends data over connection
   */
  @SuppressLint("NewApi")
  fun start() {

    job =
        workerScope.launch {
          while (isActive) {
            try {
              val update = frameChannel.receive()
              sendUpdate(update)
            } catch (e: CancellationException) {} catch (e: java.lang.Exception) {
              Log.e(LogTag, "Unexpected Error in channel ", e)
            }
          }
          Log.i(LogTag, "Shutting down worker")
        }
  }

  fun stop() {
    job?.cancel()
    job = null
    // drain channel
    frameChannel.tryReceive()
  }

  private fun sendUpdate(update: Update) {

    val queuingTimeMs = System.currentTimeMillis() - update.queuedTimestamp

    stopWatch.start()
    val nodes =
        try {
          update.deferredNodes.map { it.value() }
        } catch (exception: Exception) {
          context.onError(
              TraversalError(
                  "DeferredProcessing",
                  exception.javaClass.simpleName,
                  exception.message ?: "",
                  exception.stackTraceToString()))
          return
        }

    val deferredComputationEndTimestamp = stopWatch.stop()

    val frameworkEvents = context.extractPendingFrameworkEvents()

    var snapshot: Snapshot? = null
    if (update.snapshotBitmap != null) {
      val stream = ByteArrayOutputStream()
      val base64Stream = Base64OutputStream(stream, Base64.DEFAULT)
      update.snapshotBitmap.bitmap.compress(Bitmap.CompressFormat.PNG, 100, base64Stream)
      snapshot = Snapshot(update.snapshotNode, stream.toString())
      update.snapshotBitmap.readyForReuse()
    }

    // it is important this comes after deferred processing since the deferred processing can create
    // metadata
    sendMetadata()

    val (serialized, serializationTimeMs) =
        StopWatch.time {
          Json.encodeToString(
              FrameScanEvent.serializer(),
              FrameScanEvent(update.startTimestamp, nodes, snapshot, frameworkEvents))
        }

    val (_, sendTimeMs) =
        StopWatch.time { context.connectionRef.connection?.send(FrameScanEvent.name, serialized) }

    // Note about payload size:
    // Payload size is an approximation as it assumes all characters
    // are ASCII encodable, this should be true for most of the payload content.
    // So, assume each character will at most occupy one byte.
    val perfStats =
        PerfStatsEvent(
            txId = update.startTimestamp,
            nodesCount = nodes.size,
            start = update.startTimestamp,
            traversalMS = update.traversalMS,
            snapshotMS = update.snapshotMS,
            queuingMS = queuingTimeMs,
            deferredComputationMS = deferredComputationEndTimestamp,
            serializationMS = serializationTimeMs,
            socketMS = sendTimeMs,
            payloadSize = serialized.length,
            snapshotSize = snapshot?.data?.length ?: 0,
            frameworkEventsCount = frameworkEvents.size)

    context.connectionRef.connection?.send(
        PerfStatsEvent.name, Json.encodeToString(PerfStatsEvent.serializer(), perfStats))
  }

  private fun sendMetadata() {
    val metadata = MetadataRegister.extractPendingMetadata()
    if (metadata.isNotEmpty()) {
      context.connectionRef.connection?.send(
          MetadataUpdateEvent.name,
          Json.encodeToString(MetadataUpdateEvent.serializer(), MetadataUpdateEvent(metadata)))
    }
  }
}
