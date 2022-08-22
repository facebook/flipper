/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.navigation;

import static org.hamcrest.CoreMatchers.hasItem;
import static org.hamcrest.MatcherAssert.assertThat;

import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.testing.FlipperConnectionMock;
import com.facebook.flipper.testing.FlipperResponderMock;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;

@RunWith(RobolectricTestRunner.class)
public class NavigationFlipperPluginTest {
  @Test
  public void greetingTest() throws Exception {
    final NavigationFlipperPlugin plugin = NavigationFlipperPlugin.getInstance();
    final FlipperConnectionMock connection = new FlipperConnectionMock();
    final FlipperResponderMock responder = new FlipperResponderMock();

    plugin.onConnect(connection);
    connection.receivers.get("greet").onReceive(null, responder);

    assertThat(
        responder.successes, hasItem(new FlipperObject.Builder().put("greeting", "Hello").build()));
  }
}
