/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.example;

import static org.hamcrest.CoreMatchers.hasItem;
import static org.hamcrest.MatcherAssert.assertThat;

import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.testing.FlipperConnectionMock;
import com.facebook.flipper.testing.FlipperResponderMock;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.annotation.Config;

@RunWith(RobolectricTestRunner.class)
@Config(application = TestApplication.class)
public class ExampleFlipperPluginTest {

  @Test
  public void greetingTest() throws Exception {
    final ExampleFlipperPlugin plugin = new ExampleFlipperPlugin();
    final FlipperConnectionMock connection = new FlipperConnectionMock();
    final FlipperResponderMock responder = new FlipperResponderMock();

    plugin.onConnect(connection);
    connection
        .receivers
        .get("displayMessage")
        .onReceive(new FlipperObject.Builder().put("message", "test").build(), responder);

    assertThat(
        responder.successes, hasItem(new FlipperObject.Builder().put("greeting", "Hello").build()));
  }
}
