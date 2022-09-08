/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.common

import android.util.Log
import com.facebook.flipper.plugins.uidebugger.LogTag

// Maintains 2 way mapping between some enum value and a readable string representation
open class EnumMapping<T>(val mapping: Map<String, T>) {

  fun getStringRepresentation(enumValue: T): String {
    val entry = mapping.entries.find { (_, value) -> value == enumValue }
    if (entry != null) {
      return entry.key
    } else {
      Log.w(
          LogTag,
          "Could not convert enum value ${enumValue.toString()} to string, known values ${mapping.entries}")
      return NoMapping
    }
  }

  fun getEnumValue(key: String): T {
    val value =
        mapping[key]
            ?: throw UIDebuggerException(
                "Could not convert string ${key} to enum value, possible values ${mapping.entries} ")
    return value
  }

  fun toInspectable(value: T, mutable: Boolean): InspectableValue.Enum {
    return InspectableValue.Enum(EnumData(mapping.keys, getStringRepresentation(value)), mutable)
  }
  companion object {
    val NoMapping = "__UNKNOWN_ENUM_VALUE__"
  }
}
