/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.commands

import com.facebook.flipper.core.FlipperObject
import com.facebook.flipper.core.FlipperReceiver
import com.facebook.flipper.core.FlipperResponder
import com.facebook.flipper.plugins.common.MainThreadFlipperReceiver
import com.facebook.flipper.plugins.uidebugger.core.UIDContext

/** An interface for extensions to the UIDebugger plugin */
abstract class Command(val context: UIDContext) {
  /** The command identifier to respond to */
  abstract fun identifier(): String

  /** Execute the command */
  abstract fun execute(params: FlipperObject, response: FlipperResponder)

  /** Receiver which is the low-level handler for the incoming request */
  open fun receiver(): FlipperReceiver {
    return object : MainThreadFlipperReceiver() {
      @kotlin.Throws(java.lang.Exception::class)
      override fun onReceiveOnMainThread(params: FlipperObject, responder: FlipperResponder) {
        execute(params, responder)
      }
    }
  }
}
