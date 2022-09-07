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
import com.facebook.flipper.plugins.uidebugger.core.ApplicationInspector
import com.facebook.flipper.plugins.uidebugger.core.ApplicationRef
import com.facebook.flipper.plugins.uidebugger.core.Context
import com.facebook.flipper.plugins.uidebugger.model.InitEvent
import com.facebook.flipper.plugins.uidebugger.model.NativeScanEvent
import kotlinx.serialization.json.Json

val LogTag = "FlipperUIDebugger"

class UIDebuggerFlipperPlugin(val application: Application) : FlipperPlugin {

  private val context: Context = Context(ApplicationRef(application))
  private var connection: FlipperConnection? = null

  override fun getId(): String {
    return "ui-debugger"
  }

  @Throws(Exception::class)
  override fun onConnect(connection: FlipperConnection) {
    this.connection = connection
    // temp solution, get from descriptor
    val inspector = ApplicationInspector(context)

    val rootDescriptor =
        inspector.descriptorRegister.descriptorForClassUnsafe(context.applicationRef.javaClass)
    connection.send(
        InitEvent.name,
        Json.encodeToString(
            InitEvent.serializer(), InitEvent(rootDescriptor.getId(context.applicationRef))))

    try {
      val nodes = inspector.traversal.traverse()
      connection.send(
          NativeScanEvent.name,
          Json.encodeToString(NativeScanEvent.serializer(), NativeScanEvent(nodes)))
    } catch (e: java.lang.Exception) {
      Log.e(LogTag, e.message.toString(), e)
    }
  }

  @Throws(Exception::class)
  override fun onDisconnect() {
    this.connection = null
  }

  override fun runInBackground(): Boolean {
    return true
  }
}
