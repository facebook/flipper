/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.observers

import android.annotation.SuppressLint
import android.graphics.Bitmap
import android.os.Looper
import android.util.Base64
import android.util.Base64OutputStream
import android.util.Log
import android.view.Choreographer
import com.facebook.flipper.plugins.uidebugger.LogTag
import com.facebook.flipper.plugins.uidebugger.common.BitmapPool
import com.facebook.flipper.plugins.uidebugger.core.UIDContext
import com.facebook.flipper.plugins.uidebugger.descriptors.Id
import com.facebook.flipper.plugins.uidebugger.descriptors.MetadataRegister
import com.facebook.flipper.plugins.uidebugger.model.FrameworkEvent
import com.facebook.flipper.plugins.uidebugger.model.MetadataUpdateEvent
import com.facebook.flipper.plugins.uidebugger.model.Node
import com.facebook.flipper.plugins.uidebugger.model.PerfStatsEvent
import com.facebook.flipper.plugins.uidebugger.model.SubtreeUpdateEvent
import com.facebook.flipper.plugins.uidebugger.util.MaybeDeferred
import java.io.ByteArrayOutputStream
import java.util.concurrent.atomic.AtomicInteger
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
import kotlinx.serialization.json.Json

data class SubtreeUpdate(
    val observerType: String,
    val rootId: Id,
    val deferredNodes: List<MaybeDeferred<Node>>,
    val startTime: Long,
    val traversalCompleteTime: Long,
    val snapshotComplete: Long,
    val frameworkEvents: List<FrameworkEvent>?,
    val snapshot: BitmapPool.ReusableBitmap?
)

data class BatchedUpdate(val updates: List<SubtreeUpdate>, val frameTimeMs: Long)

/** Holds the root observer and manages sending updates to desktop */
class TreeObserverManager(val context: UIDContext) {

  private val rootObserver = ApplicationTreeObserver(context)
  private lateinit var batchedUpdates: Channel<BatchedUpdate>

  private val subtreeUpdateBuffer = SubtreeUpdateBuffer(this::enqueueBatch)

  private var job: Job? = null
  private val workerScope = CoroutineScope(Dispatchers.IO)
  private val mainScope = CoroutineScope(Dispatchers.Main)
  private val txId = AtomicInteger()

  fun enqueueUpdate(update: SubtreeUpdate) {
    subtreeUpdateBuffer.bufferUpdate(update)
  }

  private fun enqueueBatch(batchedUpdate: BatchedUpdate) {
    batchedUpdates.trySend(batchedUpdate)
  }

  /**
   * 1. Sets up the root observer
   * 2. Starts worker to listen to channel, which serializers and sends data over connection
   */
  @SuppressLint("NewApi")
  fun start() {

    if (Looper.myLooper() != Looper.getMainLooper()) {
      mainScope.launch { start() }
    }
    batchedUpdates = Channel(Channel.UNLIMITED)
    rootObserver.subscribe(context.applicationRef)

    job =
        workerScope.launch {
          while (isActive) {
            try {
              val update = batchedUpdates.receive()
              sendBatchedUpdate(update)
            } catch (e: CancellationException) {} catch (e: java.lang.Exception) {
              Log.e(LogTag, "Unexpected Error in channel ", e)
            }
          }
          Log.i(LogTag, "Shutting down worker")
        }
  }

  fun stop() {
    rootObserver.cleanUpRecursive()
    job?.cancel()
    batchedUpdates.cancel()
  }

  private fun sendBatchedUpdate(batchedUpdate: BatchedUpdate) {

    Log.i(
        LogTag,
        "Got update from ${batchedUpdate.updates.size} observers at time ${batchedUpdate.frameTimeMs}")
    val onWorkerThread = System.currentTimeMillis()

    val nodes = batchedUpdate.updates.flatMap { it.deferredNodes.map { it.value() } }
    val frameworkEvents = batchedUpdate.updates.flatMap { it.frameworkEvents ?: listOf() }
    val snapshotUpdate = batchedUpdate.updates.find { it.snapshot != null }
    val deferredComptationComplete = System.currentTimeMillis()

    var snapshot: String? = null
    if (snapshotUpdate?.snapshot != null) {
      val stream = ByteArrayOutputStream()
      val base64Stream = Base64OutputStream(stream, Base64.DEFAULT)
      snapshotUpdate.snapshot.bitmap?.compress(Bitmap.CompressFormat.PNG, 100, base64Stream)
      snapshot = stream.toString()
      snapshotUpdate.snapshot.readyForReuse()
    }

    // it is important this comes after deferred processing since the deferred processing can create
    // metadata
    sendMetadata()

    val serialized =
        Json.encodeToString(
            SubtreeUpdateEvent.serializer(),
            SubtreeUpdateEvent(
                batchedUpdate.frameTimeMs,
                "batched",
                snapshotUpdate?.rootId ?: 1,
                nodes,
                snapshot,
                frameworkEvents))

    val serializationEnd = System.currentTimeMillis()

    context.connectionRef.connection?.send(SubtreeUpdateEvent.name, serialized)

    val socketEnd = System.currentTimeMillis()
    Log.i(LogTag, "Sent event for batched subtree update  with  nodes with ${nodes.size}")

    val perfStats =
        PerfStatsEvent(
            txId = batchedUpdate.frameTimeMs,
            observerType = "batched",
            start = batchedUpdate.updates.minOf { it.startTime },
            traversalComplete = batchedUpdate.updates.maxOf { it.traversalCompleteTime },
            snapshotComplete = batchedUpdate.updates.maxOf { it.snapshotComplete },
            queuingComplete = onWorkerThread,
            deferredComputationComplete = deferredComptationComplete,
            serializationComplete = serializationEnd,
            socketComplete = socketEnd,
            nodesCount = nodes.size)

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

/** Buffers up subtree updates untill the frame is complete, should only be called on main thread */
private class SubtreeUpdateBuffer(private val onBatchReady: (BatchedUpdate) -> Unit) {

  private val bufferedSubtreeUpdates = mutableListOf<SubtreeUpdate>()

  fun bufferUpdate(update: SubtreeUpdate) {
    if (bufferedSubtreeUpdates.isEmpty()) {

      Choreographer.getInstance().postFrameCallback { frameTime ->
        val updatesCopy = bufferedSubtreeUpdates.toList()
        bufferedSubtreeUpdates.clear()

        onBatchReady(BatchedUpdate(updatesCopy, frameTime / 1000000))
      }
    }
    bufferedSubtreeUpdates.add(update)
  }
}
