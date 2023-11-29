/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger

import com.facebook.flipper.plugins.uidebugger.core.ApplicationRef
import com.facebook.flipper.plugins.uidebugger.core.UIDContext
import org.junit.Assert
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment

@RunWith(RobolectricTestRunner::class)
class UIDebuggerFlipperPluginTest {

  val app = Mockito.spy(RuntimeEnvironment.application)
  private var appRef: ApplicationRef = Mockito.spy(ApplicationRef(app))

  @Before
  open fun setup() {
    Mockito.`when`(app.applicationContext).thenReturn(app)
    Mockito.`when`(app.packageName).thenReturn("com.facebook.flipper")
  }

  @Throws(Exception::class)
  @Test
  fun emptyTest() {
    var plugin = UIDebuggerFlipperPlugin(UIDContext.create(app))
    Assert.assertNotNull(plugin)
  }
}
