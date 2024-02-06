/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.model

import com.facebook.flipper.plugins.uidebugger.descriptors.Id

@kotlinx.serialization.Serializable
class InitEvent(val rootId: Id, val frameworkEventMetadata: List<FrameworkEventMetadata>) {
  companion object {
    const val name = "init"
  }
}

@kotlinx.serialization.Serializable
class MetadataUpdateEvent(val attributeMetadata: Map<MetadataId, Metadata> = emptyMap()) {
  companion object {
    const val name = "metadataUpdate"
  }
}

@kotlinx.serialization.Serializable
class FrameScanEvent(
    val frameTime: Long,
    val nodes: List<Node>,
    val snapshot: Snapshot?,
    val frameworkEvents: List<FrameworkEvent>?
) {
  companion object {
    const val name = "frameScan"
  }
}

@kotlinx.serialization.Serializable
class TraversalError(
    val nodeName: String,
    val errorType: String,
    val errorMessage: String,
    val stack: String
) {
  companion object {
    const val name = "traversalError"
  }
}

@kotlinx.serialization.Serializable class Snapshot(val nodeId: Id, val data: String)

/** Separate optional performance statistics event */
@kotlinx.serialization.Serializable
class PerfStatsEvent(
    val txId: Long,
    val nodesCount: Int,
    val frameworkEventsCount: Int,
    val start: Long,
    val traversalMS: Long,
    val snapshotMS: Long,
    val queuingMS: Long,
    val deferredComputationMS: Long,
    val serializationMS: Long,
    val socketMS: Long,
    val payloadSize: Int,
    val snapshotSize: Int,
) {
  companion object {
    const val name = "performanceStats"
  }
}
