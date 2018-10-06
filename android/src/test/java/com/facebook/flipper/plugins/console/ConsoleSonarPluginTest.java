/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
package com.facebook.flipper.plugins.console;

import static org.hamcrest.CoreMatchers.hasItem;
import static org.hamcrest.MatcherAssert.assertThat;

import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.testing.FlipperConnectionMock;
import com.facebook.flipper.testing.FlipperResponderMock;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;

@RunWith(RobolectricTestRunner.class)
public class ConsoleSonarPluginTest {

  FlipperConnectionMock connection;
  FlipperResponderMock responder;

  @Before
  public void setup() throws Exception {
    JavascriptEnvironment jsEnvironment = new JavascriptEnvironment();
    final ConsoleFlipperPlugin plugin = new ConsoleFlipperPlugin(jsEnvironment);
    connection = new FlipperConnectionMock();
    responder = new FlipperResponderMock();
    plugin.onConnect(connection);
  }

  @Test
  public void simpleExpressionShouldEvaluateCorrectly() throws Exception {

    receiveScript("2 + 2");
    assertThat(
        responder.successes,
        hasItem(new FlipperObject.Builder().put("value", 4).put("type", "json").build()));
  }

  private void receiveScript(String a) throws Exception {
    FlipperObject getValue = new FlipperObject.Builder().put("command", a).build();
    connection.receivers.get("executeCommand").onReceive(getValue, responder);
  }
}
