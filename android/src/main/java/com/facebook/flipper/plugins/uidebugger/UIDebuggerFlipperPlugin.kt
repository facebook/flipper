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
import com.facebook.flipper.plugins.uidebugger.commands.CommandRegister
import com.facebook.flipper.plugins.uidebugger.commands.GetRoot
import com.facebook.flipper.plugins.uidebugger.core.ApplicationRef
import com.facebook.flipper.plugins.uidebugger.core.Context

class UIDebuggerFlipperPlugin(application: Application) : FlipperPlugin {
  private val context: Context = Context(ApplicationRef(application))
  private var connection: FlipperConnection? = null

  override fun getId(): String {
    return "UIDebugger"
  }

  @Throws(Exception::class)
  override fun onConnect(connection: FlipperConnection) {
    this.connection = connection
    registerCommands(connection)
  }

  @Throws(Exception::class)
  override fun onDisconnect() {
    this.connection = null
  }

  override fun runInBackground(): Boolean {
    return true
  }

  fun registerCommands(connection: FlipperConnection) {
    CommandRegister.register(connection, GetRoot(context))
  }
}
