/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.model

import com.facebook.flipper.plugins.uidebugger.descriptors.Id

@kotlinx.serialization.Serializable
data class InitEvent(val rootId: Id) {
  companion object {
    const val name = "init"
  }
}

@kotlinx.serialization.Serializable
data class SubtreeUpdateEvent(val txId: Long, val observerType: String, val nodes: List<Node>) {
  companion object {
    const val name = "subtreeUpdate"
  }
}

@kotlinx.serialization.Serializable
data class NativeScanEvent(val txId: Long, val nodes: List<Node>) {
  companion object {
    const val name = "nativeScan"
  }
}

/** Separate optional performance statistics event */
@kotlinx.serialization.Serializable
data class PerfStatsEvent(
    val txId: Long,
    val observerType: String,
    val start: Long,
    val traversalComplete: Long,
    val queuingComplete: Long,
    val serializationComplete: Long,
    val socketComplete: Long,
    val nodesCount: Int
) {
  companion object {
    const val name = "perfStats"
  }
}
