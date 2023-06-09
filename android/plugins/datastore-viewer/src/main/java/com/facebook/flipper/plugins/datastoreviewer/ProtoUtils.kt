/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.datastoreviewer

import com.facebook.flipper.core.FlipperObject
import com.google.protobuf.GeneratedMessageLite
import java.lang.reflect.Modifier

internal fun GeneratedMessageLite<*, *>.setData(
  name: String,
  value: Any,
): GeneratedMessageLite<*, *> {
  return toBuilder().apply {
    val instance = javaClass.superclass.getDeclaredField("instance")
      .apply { isAccessible = true }
      .get(this)
    val field = instance.javaClass.getDeclaredField(name)
      .apply { isAccessible = true }

    runCatching {
      field.set(instance, value)
    }.onFailure {
      val newValue = when (val originalValue = field.get(instance)) {
        is Float -> (value as Double).toFloat()
        else -> {
          throw IllegalArgumentException("key: $name originalValue: $originalValue newValue: ${value}\nTypeCast ${value.javaClass.simpleName} to ${originalValue.javaClass.simpleName} is not supported!!")
        }
      }
      field.set(instance, newValue)
    }
  }.build()
}

internal fun GeneratedMessageLite<*, *>.toFlipperObject(): FlipperObject {
  return FlipperObject.Builder().apply {
    this@toFlipperObject.javaClass.declaredFields
      .filterNot { Modifier.isStatic(it.modifiers) }
      .forEach {
        it.isAccessible = true
        put(it.name, it.get(this@toFlipperObject))
      }
  }.build()
}
