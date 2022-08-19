/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.commands

import com.facebook.flipper.core.FlipperObject
import com.facebook.flipper.core.FlipperResponder
import com.facebook.flipper.plugins.uidebugger.core.Context

class GetRoot(context: Context) : Command(context) {
  override fun identifier(): String {
    return "getRoot"
  }

  override fun execute(params: FlipperObject, response: FlipperResponder) {}
}
