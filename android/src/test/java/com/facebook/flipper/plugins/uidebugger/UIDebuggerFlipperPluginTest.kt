/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger

import org.junit.Assert
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class UIDebuggerFlipperPluginTest {
  @Throws(Exception::class)
  @Test
  fun emptyTest() {
    var plugin = UIDebuggerFlipperPlugin()
    Assert.assertNotNull(plugin)
  }
}
