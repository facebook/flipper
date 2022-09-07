/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.model

@kotlinx.serialization.Serializable
data class InitEvent(val rootId: String) {
  companion object {
    const val name = "init"
  }
}

@kotlinx.serialization.Serializable
data class NativeScanEvent(val nodes: List<Node>) {
  companion object {
    const val name = "nativeScan"
  }
}
