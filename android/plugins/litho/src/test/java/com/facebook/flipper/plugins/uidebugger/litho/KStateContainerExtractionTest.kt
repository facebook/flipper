/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import com.facebook.flipper.plugins.uidebugger.litho.descriptors.props.ComponentDataExtractor
import com.facebook.flipper.plugins.uidebugger.model.InspectableArray
import com.facebook.flipper.plugins.uidebugger.model.InspectableObject
import com.facebook.flipper.plugins.uidebugger.model.InspectableValue
import com.facebook.litho.KStateContainer
import junit.framework.Assert.assertEquals
import org.junit.Test

class KStateContainerExtractionTest {
  @Test
  @Throws(Exception::class)
  fun testCanExtractKState() {

    // this test ensures that our reflection based extraction doesn't break if the KState class
    // structure changes
    val stateContainer = KStateContainer.withNewState(null, "foo")

    val result = ComponentDataExtractor.getState(stateContainer, "Comp1")

    assertEquals(
        result,
        InspectableObject(mapOf(1 to InspectableArray(listOf(InspectableValue.Text("foo"))))))
  }
}
