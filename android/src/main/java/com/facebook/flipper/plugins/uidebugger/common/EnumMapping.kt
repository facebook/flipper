/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.common

import android.util.Log
import com.facebook.flipper.plugins.uidebugger.LogTag
import com.facebook.flipper.plugins.uidebugger.model.Enumeration
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

  fun toInspectable(value: T): InspectableValue.Enum {
    return InspectableValue.Enum(Enumeration(mapping.keys, getStringRepresentation(value)))
  }
  companion object {
    const val NoMapping = "__UNKNOWN_ENUM_VALUE__"
  }
}
