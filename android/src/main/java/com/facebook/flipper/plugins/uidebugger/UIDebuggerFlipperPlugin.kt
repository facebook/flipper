/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger

import android.app.Application
import com.facebook.flipper.core.FlipperConnection
import com.facebook.flipper.core.FlipperPlugin
import com.facebook.flipper.plugins.uidebugger.core.ApplicationRef
import com.facebook.flipper.plugins.uidebugger.core.ConnectionRef
import com.facebook.flipper.plugins.uidebugger.core.Context
import com.facebook.flipper.plugins.uidebugger.core.NativeScanScheduler
import com.facebook.flipper.plugins.uidebugger.model.InitEvent
import com.facebook.flipper.plugins.uidebugger.scheduler.Scheduler
import kotlinx.serialization.json.Json

val LogTag = "FlipperUIDebugger"

class UIDebuggerFlipperPlugin(val application: Application) : FlipperPlugin {

  private val context: Context = Context(ApplicationRef(application), ConnectionRef(null))

  private val nativeScanScheduler = Scheduler(NativeScanScheduler(context))

  override fun getId(): String {
    return "ui-debugger"
  }

  @Throws(Exception::class)
  override fun onConnect(connection: FlipperConnection) {
    this.context.connectionRef.connection = connection

    val rootDescriptor =
        context.descriptorRegister.descriptorForClassUnsafe(context.applicationRef.javaClass)

    connection.send(
        InitEvent.name,
        Json.encodeToString(
            InitEvent.serializer(), InitEvent(rootDescriptor.getId(context.applicationRef))))

    nativeScanScheduler.start()
  }

  @Throws(Exception::class)
  override fun onDisconnect() {
    this.context.connectionRef.connection = null
    this.nativeScanScheduler.stop()
  }

  override fun runInBackground(): Boolean {
    return false
  }
}
