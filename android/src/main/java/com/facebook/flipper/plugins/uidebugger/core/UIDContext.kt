/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.core

import android.app.Application
import android.os.Build
import com.facebook.flipper.core.FlipperConnection
import com.facebook.flipper.plugins.uidebugger.common.BitmapPool
import com.facebook.flipper.plugins.uidebugger.descriptors.DescriptorRegister
import com.facebook.flipper.plugins.uidebugger.model.FrameworkEvent
import com.facebook.flipper.plugins.uidebugger.model.FrameworkEventMetadata
import com.facebook.flipper.plugins.uidebugger.model.TraversalError
import kotlinx.serialization.json.Json

interface ConnectionListener {
  fun onConnect()

  fun onDisconnect()
}

class UIDContext(
    val applicationRef: ApplicationRef,
    val connectionRef: ConnectionRef,
    val descriptorRegister: DescriptorRegister,
    val frameworkEventMetadata: MutableList<FrameworkEventMetadata>,
    val connectionListeners: MutableList<ConnectionListener>,
    private val pendingFrameworkEvents: MutableList<FrameworkEvent>
) {

  val bitmapPool = BitmapPool()
  private val canvasSnapshotter = CanvasSnapshotter(bitmapPool)

  val snapshotter =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        PixelCopySnapshotter(bitmapPool, applicationRef, canvasSnapshotter)
      } else {
        canvasSnapshotter
      }

  val decorViewTracker = DecorViewTracker(this, snapshotter)
  val updateQueue = UpdateQueue(this)
  val layoutTraversal: LayoutTraversal = LayoutTraversal(this)

  fun addFrameworkEvent(frameworkEvent: FrameworkEvent) {
    synchronized(pendingFrameworkEvents) { pendingFrameworkEvents.add(frameworkEvent) }
  }

  fun onError(traversalError: TraversalError) {
    connectionRef.connection?.send(
        TraversalError.name, Json.encodeToString(TraversalError.serializer(), traversalError))
  }

  fun extractPendingFrameworkEvents(): List<FrameworkEvent> {
    synchronized(pendingFrameworkEvents) {
      val copy = pendingFrameworkEvents.toList()
      pendingFrameworkEvents.clear()
      return copy
    }
  }

  fun clearFrameworkEvents() {
    synchronized(pendingFrameworkEvents) { pendingFrameworkEvents.clear() }
  }

  companion object {
    fun create(application: Application): UIDContext {
      return UIDContext(
          ApplicationRef(application),
          ConnectionRef(null),
          descriptorRegister = DescriptorRegister.withDefaults(),
          frameworkEventMetadata = mutableListOf(),
          connectionListeners = mutableListOf(),
          pendingFrameworkEvents = mutableListOf())
    }
  }
}

data class ConnectionRef(var connection: FlipperConnection?)
