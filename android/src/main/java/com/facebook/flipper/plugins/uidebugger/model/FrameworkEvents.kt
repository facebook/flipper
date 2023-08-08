/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.model

import com.facebook.flipper.plugins.uidebugger.descriptors.Id

@kotlinx.serialization.Serializable
data class FrameworkEventMetadata(
    val type: String,
    val documentation: String,
)

@kotlinx.serialization.Serializable
data class FrameworkEvent(
    val nodeId: Id,
    val type: String,
    val timestamp: Long,
    val thread: String
)
