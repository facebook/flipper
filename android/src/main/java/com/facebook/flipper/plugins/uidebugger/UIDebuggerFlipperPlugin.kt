/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger

import android.app.Application
import android.util.Log
import com.facebook.flipper.core.FlipperConnection
import com.facebook.flipper.core.FlipperPlugin
import com.facebook.flipper.plugins.uidebugger.core.*
import com.facebook.flipper.plugins.uidebugger.descriptors.DescriptorRegister
import com.facebook.flipper.plugins.uidebugger.descriptors.MetadataRegister
import com.facebook.flipper.plugins.uidebugger.descriptors.nodeId
import com.facebook.flipper.plugins.uidebugger.model.InitEvent
import com.facebook.flipper.plugins.uidebugger.model.MetadataUpdateEvent
import com.facebook.flipper.plugins.uidebugger.observers.TreeObserverFactory
import kotlinx.serialization.json.Json

const val LogTag = "ui-debugger"

class UIDebuggerFlipperPlugin(
    val application: Application,
    descriptorRegister: DescriptorRegister?,
    observerFactory: TreeObserverFactory?
) : FlipperPlugin {

  private val context: Context =
      Context(
          ApplicationRef(application),
          ConnectionRef(null),
          descriptorRegister = descriptorRegister ?: DescriptorRegister.withDefaults(),
          observerFactory = observerFactory ?: TreeObserverFactory.withDefaults())

  init {
    Log.i(LogTag, "Initializing ui-debugger")
  }

  override fun getId(): String {
    return "ui-debugger"
  }

  @Throws(Exception::class)
  override fun onConnect(connection: FlipperConnection) {
    Log.i(LogTag, "Connected")
    this.context.connectionRef.connection = connection
    this.context.bitmapPool.makeReady()

    connection.send(
        InitEvent.name,
        Json.encodeToString(InitEvent.serializer(), InitEvent(context.applicationRef.nodeId())))

    connection.send(
        MetadataUpdateEvent.name,
        Json.encodeToString(
            MetadataUpdateEvent.serializer(),
            MetadataUpdateEvent(MetadataRegister.staticMetadata())))

    context.treeObserverManager.start()
  }

  @Throws(Exception::class)
  override fun onDisconnect() {
    this.context.connectionRef.connection = null
    Log.i(LogTag, "Disconnected")

    MetadataRegister.clear()

    context.treeObserverManager.stop()
    context.bitmapPool.recycleAll()
  }

  override fun runInBackground(): Boolean {
    return false
  }
}
