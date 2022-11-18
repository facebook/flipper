/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.model

typealias MetadataId = Int

/**
 * Represent metadata associated for an attribute. MetadataId is a unique identifier used by
 * attributes to refer to its metadata. Type refers to attribute semantics. It can represent:
 * identity, attributes, layout, documentation, or a custom type.
 */
@kotlinx.serialization.Serializable
data class Metadata(
    val id: MetadataId,
    val type: String,
    val namespace: String,
    val name: String,
    val mutable: kotlin.Boolean,
    val possibleValues: Set<InspectableValue>? = emptySet(),
    val tags: List<String>? = emptyList()
) {}
