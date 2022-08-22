/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.common

import androidx.collection.ArrayMap
import androidx.collection.SimpleArrayMap

open class EnumMapping<T>(private val defaultKey: String) {
  private val map = ArrayMap<String, T>()

  fun put(key: String, value: T) {
    map.put(key, value)
  }

  fun get(value: T): InspectableValue<String> {
    return get(value, true)
  }

  fun get(value: T, mutable: Boolean = true): InspectableValue<String> {
    val key = findKeyForValue(map, defaultKey, value)
    return if (mutable) InspectableValue.mutable(InspectableValue.Type.Enum, key)
    else InspectableValue.immutable(InspectableValue.Type.Enum, key)
  }

  fun get(s: String): T? {
    return if (map.containsKey(s)) {
      map[s]
    } else map[defaultKey]
  }

  fun toPicker(mutable: Boolean = true): InspectableValue<*> {
    return if (mutable)
        InspectableValue.mutable(
            InspectableValue.Type.Picker, InspectableValue.Picker(map.keys, defaultKey))
    else InspectableValue.immutable(InspectableValue.Type.Enum, defaultKey)
  }

  fun toPicker(currentValue: T, mutable: Boolean = true): InspectableValue<*> {
    val value = findKeyForValue(map, defaultKey, currentValue)
    return if (mutable)
        InspectableValue.mutable(
            InspectableValue.Type.Picker, InspectableValue.Picker(map.keys, value))
    else InspectableValue.immutable(InspectableValue.Type.Enum, value)
  }

  companion object {
    fun <T> findKeyForValue(
        mapping: SimpleArrayMap<String, T>,
        defaultKey: String,
        currentValue: T
    ): String {
      val count = mapping.size() - 1
      for (i in 0..count) {
        if (mapping.valueAt(i) == currentValue) {
          return mapping.keyAt(i)
        }
      }
      return defaultKey
    }
  }
}
