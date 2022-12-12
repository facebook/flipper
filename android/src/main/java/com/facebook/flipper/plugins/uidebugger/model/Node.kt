/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.model

import com.facebook.flipper.plugins.uidebugger.descriptors.Id

@kotlinx.serialization.Serializable
data class Node(
    val id: Id,
    val qualifiedName: String,
    val name: String,
    val attributes: Map<MetadataId, InspectableObject>,
    val inlineAttributes: Map<String, String>,
    val bounds: Bounds,
    val tags: Set<String>,
    val children: List<Id>,
    val activeChild: Id?,
)
