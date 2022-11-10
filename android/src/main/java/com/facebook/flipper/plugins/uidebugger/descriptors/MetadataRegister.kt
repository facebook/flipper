/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.descriptors

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
  private val staticMetadata: MutableMap<String, Metadata> = mutableMapOf()
  private val dynamicMetadata: MutableMap<String, Metadata> = mutableMapOf()
  private val queried: MutableSet<MetadataId> = mutableSetOf()

  fun key(namespace: String, name: String): String = "${namespace}_$name"

  private fun register(
      metadata: MutableMap<String, Metadata>,
      type: String,
      namespace: String,
      name: String,
      mutable: Boolean
  ): MetadataId {
    val key = key(namespace, name)
    metadata[key]?.let { m ->
      return m.id
    }

    val identifier = ++generator
    metadata[key] = Metadata(identifier, type, namespace, name, mutable)
    return identifier
  }

  fun register(
      type: String,
      namespace: String,
      name: String,
      mutable: Boolean = false
  ): MetadataId {
    return register(staticMetadata, type, namespace, name, mutable)
  }

  fun registerDynamic(
      type: String,
      namespace: String,
      name: String,
      mutable: Boolean = false
  ): MetadataId {
    return register(dynamicMetadata, type, namespace, name, mutable)
  }

  fun get(namespace: String, name: String): Metadata? {
    val key = key(namespace, name)
    staticMetadata[key]?.let {
      return it
    }
    return dynamicMetadata[key]
  }

  fun staticMetadata(): Map<MetadataId, Metadata> {
    val metadata: MutableMap<MetadataId, Metadata> = mutableMapOf()
    staticMetadata.forEach { entry -> metadata[entry.value.id] = entry.value }
    return metadata
  }

  fun dynamicMetadata(): Map<MetadataId, Metadata> {
    val metadata: MutableMap<MetadataId, Metadata> = mutableMapOf()
    dynamicMetadata.forEach { entry ->
      if (!queried.contains(entry.value.id)) {
        metadata[entry.value.id] = entry.value
        queried.add(entry.value.id)
      }
    }

    return metadata
  }

  fun clear() {
    queried.clear()
  }
}
