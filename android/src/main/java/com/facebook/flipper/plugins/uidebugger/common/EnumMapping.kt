/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.common

import android.util.Log
import com.facebook.flipper.plugins.uidebugger.LogTag
import com.facebook.flipper.plugins.uidebugger.model.InspectableValue

// Maintains 2 way mapping between some enum value and a readable string representation
open class EnumMapping<T>(private val mapping: Map<String, T>) {

  fun getStringRepresentation(enumValue: T): String {
    val entry = mapping.entries.find { (_, value) -> value == enumValue }
    return if (entry != null) {
      entry.key
    } else {
      Log.v(
          LogTag,
          "Could not convert enum value ${enumValue.toString()} to string, known values ${mapping.entries}")
      NoMapping
    }
  }

  fun getEnumValue(key: String): T {
    return mapping[key]
        ?: throw UIDebuggerException(
            "Could not convert string $key to enum value, possible values ${mapping.entries} ")
  }

  fun getInspectableValues(): Set<InspectableValue> {
    val set: MutableSet<InspectableValue> = mutableSetOf()
    mapping.entries.forEach { set.add(InspectableValue.Text(it.key)) }
    return set
  }

  fun toInspectable(value: T): InspectableValue.Enum {
    return InspectableValue.Enum(getStringRepresentation(value))
  }
  companion object {
    const val NoMapping = "__UNKNOWN_ENUM_VALUE__"
  }
}

inline fun <reified T : Enum<T>> enumerator(): Iterator<T> = enumValues<T>().iterator()

inline fun <reified T : Enum<T>> enumToSet(): Set<String> {
  val set = mutableSetOf<String>()
  val values = enumerator<T>()
  values.forEach { set.add(it.name) }
  return set
}

inline fun <reified T : Enum<T>> enumToInspectableSet(): Set<InspectableValue> {
  val set = mutableSetOf<InspectableValue>()
  val values = enumerator<T>()
  values.forEach { set.add(InspectableValue.Text(it.name)) }
  return set
}

inline fun <reified T : Enum<T>> enumMapping(): EnumMapping<T> {
  val map = mutableMapOf<String, T>()
  val values = enumerator<T>()
  values.forEach { map[it.name] = it }
  return EnumMapping<T>(map)
}
