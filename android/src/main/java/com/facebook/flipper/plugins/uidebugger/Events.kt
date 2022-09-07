/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger

import com.facebook.flipper.plugins.uidebugger.common.Node

@kotlinx.serialization.Serializable
data class InitEvent(val rootId: String) {
  companion object {
    val name = "init"
  }
}

// TODO flatten the tree into normalised list
@kotlinx.serialization.Serializable
data class NativeScanEvent(val root: Node) {
  companion object {
    val name = "nativeScan"
  }
}
