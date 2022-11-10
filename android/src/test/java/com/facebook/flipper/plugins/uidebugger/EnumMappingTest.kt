/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger

import android.view.View
import com.facebook.flipper.plugins.uidebugger.common.EnumMapping
import com.facebook.flipper.plugins.uidebugger.model.Enumeration
import com.facebook.flipper.plugins.uidebugger.model.InspectableValue
import org.hamcrest.CoreMatchers.*
import org.hamcrest.MatcherAssert.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class EnumMappingTest {

  val visibility: EnumMapping<Int> =
      object :
          EnumMapping<Int>(
              mapOf(
                  "VISIBLE" to View.VISIBLE, "INVISIBLE" to View.INVISIBLE, "GONE" to View.GONE)) {}

  @Test
  fun testTurnsEnumToString() {
    assertThat(visibility.getEnumValue("VISIBLE"), equalTo(View.VISIBLE))
  }

  @Test
  fun testTurnsStringToEnum() {
    assertThat(visibility.getStringRepresentation(View.VISIBLE), equalTo("VISIBLE"))
  }

  @Test
  fun testTurnsIntoEnumInspectable() {
    assertThat(
        visibility.toInspectable(View.GONE),
        equalTo(InspectableValue.Enum(Enumeration(setOf("VISIBLE", "INVISIBLE", "GONE"), "GONE"))))
  }
}
