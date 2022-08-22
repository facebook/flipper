/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger

import android.view.View
import com.facebook.flipper.plugins.uidebugger.common.EnumMapping
import com.facebook.flipper.plugins.uidebugger.common.InspectableValue
import org.hamcrest.CoreMatchers
import org.hamcrest.CoreMatchers.*
import org.hamcrest.MatcherAssert.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class EnumMappingTest {
  @Throws(Exception::class)
  @Test
  fun emptyMapping() {
    val e: EnumMapping<Int> = object : EnumMapping<Int>("k") {}

    assertThat(e.get("j"), CoreMatchers.`is`(nullValue()))

    var inspectable = e.get(0)
    assertThat(inspectable.mutable, equalTo(true))
    assertThat(inspectable.type, equalTo(InspectableValue.Type.Enum))
    assertThat(inspectable.value, equalTo("k"))

    inspectable = e.get(0, true)
    assertThat(inspectable.mutable, equalTo(true))
    assertThat(inspectable.type, equalTo(InspectableValue.Type.Enum))
    assertThat(inspectable.value, equalTo("k"))

    inspectable = e.get(0, false)
    assertThat(inspectable.mutable, equalTo(false))
    assertThat(inspectable.type, equalTo(InspectableValue.Type.Enum))
    assertThat(inspectable.value, equalTo("k"))

    var picker = e.toPicker()
    assertThat(picker.mutable, equalTo(true))
    assertThat(picker.type, equalTo(InspectableValue.Type.Picker))
    assertThat(picker.value, CoreMatchers.`is`(notNullValue()))

    val value: InspectableValue.Picker = picker.value as InspectableValue.Picker
    assertThat(value.selected, equalTo("k"))
    assertThat(value.values.size, equalTo(0))
  }

  @Throws(Exception::class)
  @Test
  fun putGet() {
    val visibility: EnumMapping<Int> =
        object : EnumMapping<Int>("VISIBLE") {
          init {
            put("VISIBLE", View.VISIBLE)
            put("INVISIBLE", View.INVISIBLE)
            put("GONE", View.GONE)
          }
        }

    assertThat(visibility.get("VISIBLE"), equalTo(View.VISIBLE))
  }
}
