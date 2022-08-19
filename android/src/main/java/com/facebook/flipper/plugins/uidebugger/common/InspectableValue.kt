/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.common

class InspectableValue<T>
private constructor(val type: Type<T>, val value: T, val mutable: Boolean) {
  /**
   * Describe the type of data this value contains. This will influence how values are parsed and
   * displayed by the Flipper desktop app. For example colors will be parse as integers and
   * displayed using hex values and be editable using a color picker.
   *
   * Do not extends this list of types without adding support for the type in the desktop Inspector.
   */
  class Type<T> internal constructor(private val name: String) {
    override fun toString(): String {
      return name
    }

    companion object {
      val Auto: Type<Any> = Type<Any>("auto")
      val Text = Type<String>("text")
      val Number = Type<Number>("number")
      val Boolean = Type<Boolean>("boolean")
      val Enum = Type<String>("enum")
      val Color = Type<Int>("color")
      val Picker = Type<Picker>("picker")
    }
  }

  class Picker(val values: Set<String>, val selected: String) {}

  companion object {
    fun <T> mutable(type: Type<T>, value: T): InspectableValue<T> {
      return InspectableValue(type, value, true)
    }

    fun <T> immutable(type: Type<T>, value: T): InspectableValue<T> {
      return InspectableValue(type, value, false)
    }

    fun mutable(value: Any): InspectableValue<*> {
      return InspectableValue<Any>(Type.Auto, value, true)
    }

    fun immutable(value: Any): InspectableValue<*> {
      return InspectableValue<Any>(Type.Auto, value, false)
    }
  }
}
