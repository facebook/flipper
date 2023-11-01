/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import com.facebook.flipper.plugins.uidebugger.descriptors.MetadataRegister
import com.facebook.flipper.plugins.uidebugger.litho.descriptors.props.ComponentDataExtractor
import com.facebook.flipper.plugins.uidebugger.model.InspectableObject
import com.facebook.flipper.plugins.uidebugger.model.InspectableValue
import com.facebook.litho.KStateContainer
import junit.framework.Assert.assertEquals
import org.junit.Test

class KStateContainerExtractionTest {
  @Test
  @Throws(Exception::class)
  fun testCanExtractKStateIntoSeparateAttributesByIndex() {

    // this test ensures that our reflection based extraction doesn't break if the KState class
    // structure changes
    MetadataRegister.reset()
    val stateContainer =
        KStateContainer.withNewState(KStateContainer.withNewState(null, "foo"), true)

    val result = ComponentDataExtractor.getState(stateContainer, "Comp1")

    val first = MetadataRegister.get("kstate", "0")?.id ?: -1
    val second = MetadataRegister.get("kstate", "1")?.id ?: -2
    assertEquals(
        InspectableObject(
            mapOf(first to InspectableValue.Text("foo"), second to InspectableValue.Boolean(true))),
        result,
    )
  }
}
