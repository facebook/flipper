/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.model

import com.facebook.flipper.plugins.uidebugger.descriptors.Id
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject

@kotlinx.serialization.Serializable
data class Node(
    val id: Id,
    val parent: Id?,
    val qualifiedName: String,
    val name: String,
    val boxData: BoxData?,
    val attributes: Map<MetadataId, InspectableObject>,
    val inlineAttributes: Map<String, String>,
    val hiddenAttributes: JsonObject?,
    val bounds: Bounds,
    val tags: Set<String>,
    val children: List<Id>,
    val activeChild: Id?,
)

/** Expected order is left right top bottom */
typealias CompactBoxData = List<Float>

@Serializable
class BoxData(val margin: CompactBoxData, val border: CompactBoxData, val padding: CompactBoxData)
