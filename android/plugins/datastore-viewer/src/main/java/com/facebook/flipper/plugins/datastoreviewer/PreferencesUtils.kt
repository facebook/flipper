/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.datastoreviewer

import androidx.datastore.preferences.core.Preferences
import com.facebook.flipper.core.FlipperObject

@Suppress("UNCHECKED_CAST")
internal fun Preferences.setData(name: String, value: Any): Preferences {
  return toMutablePreferences().apply {
    val (originalKey, originalValue) = asMap().entries.first { it.key.name == name }
    if (originalValue is Set<*>) {
      throw IllegalArgumentException("key: $name value: ${originalValue}\nType ${originalValue.javaClass.simpleName} is not supported!!")
    }
    set(originalKey as Preferences.Key<Any>, value)
  }
}

internal fun Preferences.deleteData(name: String): Preferences {
  return toMutablePreferences().apply {
    val originalEntry = asMap().entries.firstOrNull { it.key.name == name }
      ?: throw IllegalArgumentException("key: $name\nvalue is null!!")
    remove(originalEntry.key)
  }
}

internal fun Preferences.toFlipperObject(): FlipperObject {
  return FlipperObject.Builder().apply {
    asMap().forEach { (key, value) ->
      put(key.name, value)
    }
  }.build()
}
