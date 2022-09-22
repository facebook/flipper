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
import com.facebook.flipper.plugins.uidebugger.descriptors.nodeId
import com.facebook.flipper.plugins.uidebugger.model.InitEvent
import com.facebook.flipper.plugins.uidebugger.observers.TreeObserverFactory
import com.facebook.flipper.plugins.uidebugger.scheduler.Scheduler
import kotlinx.coroutines.*
import kotlinx.serialization.json.Json

const val LogTag = "uidebugger"

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

  private val nativeScanScheduler = Scheduler(NativeScanScheduler(context))

  init {
    Log.i(LogTag, "Initializing UI Debugger")
  }

  override fun getId(): String {
    return "ui-debugger"
  }

  @Throws(Exception::class)
  override fun onConnect(connection: FlipperConnection) {
    Log.i(LogTag, "Connected")
    this.context.connectionRef.connection = connection

    val rootDescriptor =
        context.descriptorRegister.descriptorForClassUnsafe(context.applicationRef.javaClass)

    connection.send(
        InitEvent.name,
        Json.encodeToString(InitEvent.serializer(), InitEvent(context.applicationRef.nodeId())))

    context.treeObserverManager.start()
  }

  @Throws(Exception::class)
  override fun onDisconnect() {
    this.context.connectionRef.connection = null
    Log.i(LogTag, "Disconnected")

    context.treeObserverManager.stop()
  }

  override fun runInBackground(): Boolean {
    return true
  }
}
