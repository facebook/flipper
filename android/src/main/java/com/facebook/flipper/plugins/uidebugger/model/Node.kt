/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.model

import com.facebook.flipper.plugins.uidebugger.common.InspectableObject

@kotlinx.serialization.Serializable
data class Node(
    val id: String,
    val name: String,
    val attributes: Map<String, InspectableObject>,
    val bounds: Bounds?,
    val tags: Set<String>,
    val children: List<String>,
    val activeChild: String?,
)

@kotlinx.serialization.Serializable
data class Bounds(val x: Int, val y: Int, val width: Int, val height: Int)
