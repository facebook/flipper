/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.model

import com.facebook.flipper.plugins.uidebugger.descriptors.Id

@kotlinx.serialization.Serializable
data class InitEvent(val rootId: Id, val frameworkEventMetadata: List<FrameworkEventMetadata>) {
  companion object {
    const val name = "init"
  }
}

@kotlinx.serialization.Serializable
data class MetadataUpdateEvent(val attributeMetadata: Map<MetadataId, Metadata> = emptyMap()) {
  companion object {
    const val name = "metadataUpdate"
  }
}

@kotlinx.serialization.Serializable
data class SubtreeUpdateEvent(
    val txId: Long,
    val observerType: String,
    val rootId: Id,
    val nodes: List<Node>,
    val snapshot: String?,
    val frameworkEvents: List<FrameworkEvent>?
) {
  companion object {
    const val name = "subtreeUpdate"
  }
}

/** Separate optional performance statistics event */
@kotlinx.serialization.Serializable
data class PerfStatsEvent(
    val txId: Long,
    val observerType: String,
    val nodesCount: Int,
    val start: Long,
    val traversalMS: Long,
    val snapshotMS: Long,
    val queuingMS: Long,
    val deferredComputationMS: Long,
    val serializationMS: Long,
    val socketMS: Long,
    val payloadSize: Int,
) {
  companion object {
    const val name = "performanceStats"
  }
}
