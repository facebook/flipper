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
import kotlinx.serialization.json.JsonPrimitive

/**
 * Registry of attribute metadata. There's two types of attributes:
 * - Static attributes. Those that are known at build time.
 * - Dynamic attributes. Those that are known at runtime.
 */
object MetadataRegister {

  const val TYPE_IDENTITY = "identity"
  const val TYPE_ATTRIBUTE = "attribute"

  private val lock = "lock"

  private var generator: MetadataId = 0
  private val register: MutableMap<String, Metadata> = mutableMapOf()
  private val pendingKeys: MutableSet<String> = mutableSetOf()

  private fun key(namespace: String, name: String): String = "${namespace}_$name"

  fun register(
      type: String,
      namespace: String,
      name: String,
      mutable: Boolean = false,
      possibleValues: Set<InspectableValue>? = null,
      customAttributes: Map<String, JsonPrimitive>? = null
  ): MetadataId {
    val key = key(namespace, name)
    register[key]?.let { m ->
      return m.id
    }

    synchronized(lock) {
      val identifier = ++generator
      val metadata =
          Metadata(identifier, type, namespace, name, mutable, possibleValues, customAttributes)

      register[key] = metadata
      pendingKeys.add(key)

      return identifier
    }
  }

  fun get(namespace: String, name: String): Metadata? {
    val key = key(namespace, name)
    return register[key]
  }

  /** gets all pending metadata to be sent and resets the pending list */
  fun extractPendingMetadata(): Map<MetadataId, Metadata> {
    synchronized(lock) {
      val pendingMetadata: MutableMap<MetadataId, Metadata> = mutableMapOf()

      pendingKeys.forEach { key ->
        register[key]?.let { metadata -> pendingMetadata[metadata.id] = metadata }
      }
      pendingKeys.clear()

      return pendingMetadata
    }
  }

  fun reset() {
    synchronized(lock) {
      pendingKeys.clear()
      register.forEach { entry -> pendingKeys.add(entry.key) }
    }
  }
}
