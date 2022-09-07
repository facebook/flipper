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
import com.facebook.flipper.plugins.uidebugger.common.Node
import com.facebook.flipper.plugins.uidebugger.core.ApplicationInspector
import com.facebook.flipper.plugins.uidebugger.core.ApplicationRef
import com.facebook.flipper.plugins.uidebugger.core.Context
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
    val root: Node = inspector.inspect()!!
    val initEvent = InitEvent(System.identityHashCode(application).toString())

    connection.send(
        InitEvent.name,
        Json.encodeToString(
            InitEvent.serializer(), InitEvent(System.identityHashCode(application).toString())))

    connection.send(
        NativeScanEvent.name,
        Json.encodeToString(NativeScanEvent.serializer(), NativeScanEvent(root)))
  }

  @Throws(Exception::class)
  override fun onDisconnect() {
    this.connection = null
  }

  override fun runInBackground(): Boolean {
    return true
  }
}
