/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.commands

import com.facebook.flipper.core.FlipperConnection

object CommandRegister {
  fun <T> register(connection: FlipperConnection, cmd: T) where T : Command {
    connection.receive(cmd.identifier(), cmd.receiver())
  }
}
