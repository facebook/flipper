/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger

import android.util.Log
import com.facebook.flipper.core.FlipperConnection
import com.facebook.flipper.core.FlipperPlugin
import com.facebook.flipper.plugins.uidebugger.core.*
import com.facebook.flipper.plugins.uidebugger.descriptors.ApplicationRefDescriptor
import com.facebook.flipper.plugins.uidebugger.descriptors.MetadataRegister
import com.facebook.flipper.plugins.uidebugger.model.InitEvent
import com.facebook.flipper.plugins.uidebugger.model.MetadataUpdateEvent
import kotlinx.serialization.json.Json

const val LogTag = "ui-debugger"

class UIDebuggerFlipperPlugin(val context: UIDContext) : FlipperPlugin {

  init {
    Log.i(LogTag, "Initializing ui-debugger")
  }

  override fun getId(): String {
    return "ui-debugger"
  }

  @Throws(Exception::class)
  override fun onConnect(connection: FlipperConnection) {
    this.context.connectionRef.connection = connection
    this.context.bitmapPool.makeReady()

    connection.send(
        InitEvent.name,
        Json.encodeToString(
            InitEvent.serializer(),
            InitEvent(
                ApplicationRefDescriptor.getId(context.applicationRef),
                context.frameworkEventMetadata)))

    connection.send(
        MetadataUpdateEvent.name,
        Json.encodeToString(
            MetadataUpdateEvent.serializer(),
            MetadataUpdateEvent(MetadataRegister.extractPendingMetadata())))

    context.updateQueue.start()
    context.decorViewTracker.start()

    context.connectionListeners.forEach { it.onConnect() }
  }

  @Throws(Exception::class)
  override fun onDisconnect() {
    this.context.connectionRef.connection = null

    MetadataRegister.reset()

    context.decorViewTracker.stop()
    context.updateQueue.stop()

    context.bitmapPool.recycleAll()
    context.connectionListeners.forEach { it.onDisconnect() }
    context.clearFrameworkEvents()
  }

  override fun runInBackground(): Boolean {
    return false
  }
}
