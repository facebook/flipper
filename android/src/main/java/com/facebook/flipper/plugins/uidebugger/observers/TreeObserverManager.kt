/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.observers

import android.annotation.SuppressLint
import android.graphics.Bitmap
import android.util.Base64
import android.util.Base64OutputStream
import android.util.Log
import com.facebook.flipper.plugins.uidebugger.LogTag
import com.facebook.flipper.plugins.uidebugger.common.BitmapPool
import com.facebook.flipper.plugins.uidebugger.core.Context
import com.facebook.flipper.plugins.uidebugger.descriptors.Id
import com.facebook.flipper.plugins.uidebugger.descriptors.MetadataRegister
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

sealed interface Update

data class SubtreeUpdate(
    val observerType: String,
    val rootId: Id,
    val deferredNodes: List<MaybeDeferred<Node>>,
    val startTime: Long,
    val traversalCompleteTime: Long,
    val snapshotComplete: Long,
    val snapshot: BitmapPool.ReusableBitmap?
)

/** Holds the root observer and manages sending updates to desktop */
class TreeObserverManager(val context: Context) {

  private val rootObserver = ApplicationTreeObserver(context)
  private lateinit var updates: Channel<SubtreeUpdate>
  private var job: Job? = null
  private val workerScope = CoroutineScope(Dispatchers.IO)
  private val txId = AtomicInteger()

  fun enqueueUpdate(update: SubtreeUpdate) {
    updates.trySend(update)
  }

  /**
   * 1. Sets up the root observer
   * 2. Starts worker to listen to channel, which serializers and sends data over connection
   */
  @SuppressLint("NewApi")
  fun start() {

    updates = Channel(Channel.UNLIMITED)
    rootObserver.subscribe(context.applicationRef)

    job =
        workerScope.launch {
          while (isActive) {
            try {
              val update = updates.receive()
              sendSubtreeUpdate(update)
            } catch (e: CancellationException) {} catch (e: java.lang.Exception) {
              Log.e(LogTag, "Unexpected Error in channel ", e)
            }
          }
          Log.i(LogTag, "Shutting down worker")
        }
  }

  private fun sendMetadata() {
    val metadata = MetadataRegister.extractPendingMetadata()
    if (metadata.size > 0) {
      context.connectionRef.connection?.send(
          MetadataUpdateEvent.name,
          Json.encodeToString(MetadataUpdateEvent.serializer(), MetadataUpdateEvent(metadata)))
    }
  }

  private fun sendSubtreeUpdate(treeUpdate: SubtreeUpdate) {
    val onWorkerThread = System.currentTimeMillis()
    val txId = txId.getAndIncrement().toLong()

    val serialized: String?
    val nodes = treeUpdate.deferredNodes.map { it.value() }
    val deferredComptationComplete = System.currentTimeMillis()

    // send metadata needs to occur after the deferred metadata extraction since inside the deferred
    // computation we may create some fresh metadata
    sendMetadata()

    if (treeUpdate.snapshot == null) {
      serialized =
          Json.encodeToString(
              SubtreeUpdateEvent.serializer(),
              SubtreeUpdateEvent(txId, treeUpdate.observerType, treeUpdate.rootId, nodes))
    } else {
      val stream = ByteArrayOutputStream()
      val base64Stream = Base64OutputStream(stream, Base64.DEFAULT)
      treeUpdate.snapshot.bitmap?.compress(Bitmap.CompressFormat.PNG, 100, base64Stream)
      val snapshot = stream.toString()
      serialized =
          Json.encodeToString(
              SubtreeUpdateEvent.serializer(),
              SubtreeUpdateEvent(txId, treeUpdate.observerType, treeUpdate.rootId, nodes, snapshot))

      treeUpdate.snapshot.readyForReuse()
    }

    val serializationEnd = System.currentTimeMillis()

    context.connectionRef.connection?.send(SubtreeUpdateEvent.name, serialized)
    val socketEnd = System.currentTimeMillis()
    Log.i(
        LogTag,
        "Sent event for ${treeUpdate.observerType} root ID ${treeUpdate.rootId} nodes ${nodes.size}")

    val perfStats =
        PerfStatsEvent(
            txId = txId,
            observerType = treeUpdate.observerType,
            start = treeUpdate.startTime,
            traversalComplete = treeUpdate.traversalCompleteTime,
            snapshotComplete = treeUpdate.snapshotComplete,
            queuingComplete = onWorkerThread,
            deferredComputationComplete = deferredComptationComplete,
            serializationComplete = serializationEnd,
            socketComplete = socketEnd,
            nodesCount = nodes.size)

    context.connectionRef.connection?.send(
        PerfStatsEvent.name, Json.encodeToString(PerfStatsEvent.serializer(), perfStats))
  }

  fun stop() {
    rootObserver.cleanUpRecursive()
    job?.cancel()
    updates.cancel()
  }
}
