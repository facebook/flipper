/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

import com.facebook.flipper.plugins.uidebugger.model.InspectableValue
import com.facebook.flipper.plugins.uidebugger.model.Metadata
import com.facebook.flipper.plugins.uidebugger.model.MetadataId

/**
 * Registry of attribute metadata. There's two types of attributes:
 * - Static attributes. Those that are known at build time.
 * - Dynamic attributes. Those that are known at runtime.
 */
object MetadataRegister {

  const val TYPE_IDENTITY = "identity"
  const val TYPE_ATTRIBUTE = "attribute"
  const val TYPE_LAYOUT = "layout"
  const val TYPE_DOCUMENTATION = "documentation"

  private var generator: MetadataId = 0
  private val register: MutableMap<String, Metadata> = mutableMapOf()
  private val pending: MutableSet<String> = mutableSetOf()

  private fun key(namespace: String, name: String): String = "${namespace}_$name"

  fun register(
      type: String,
      namespace: String,
      name: String,
      mutable: Boolean = false,
      possibleValues: Set<InspectableValue>? = emptySet()
  ): MetadataId {
    val key = key(namespace, name)
    register[key]?.let { m ->
      return m.id
    }

    val identifier = ++generator
    val metadata = Metadata(identifier, type, namespace, name, mutable, possibleValues)

    register[key] = metadata
    pending.add(key)

    return identifier
  }

  fun get(namespace: String, name: String): Metadata? {
    val key = key(namespace, name)
    return register[key]
  }

  fun getMetadata(): Map<MetadataId, Metadata> {
    val metadata: MutableMap<MetadataId, Metadata> = mutableMapOf()
    register.forEach { entry -> metadata[entry.value.id] = entry.value }

    return metadata
  }

  fun getPendingMetadata(): Map<MetadataId, Metadata> {
    val pendingMetadata: MutableMap<MetadataId, Metadata> = mutableMapOf()
    pending.forEach { key ->
      register[key]?.let { metadata -> pendingMetadata[metadata.id] = metadata }
    }

    return pendingMetadata
  }

  fun reset() {
    pending.clear()
    register.forEach { entry -> pending.add(entry.key) }
  }
}
