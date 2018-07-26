/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
package com.facebook.sonar.plugins.console;

import static org.hamcrest.CoreMatchers.hasItem;
import static org.hamcrest.MatcherAssert.assertThat;

import com.facebook.sonar.core.SonarObject;
import com.facebook.sonar.testing.SonarConnectionMock;
import com.facebook.sonar.testing.SonarResponderMock;
import com.facebook.testing.robolectric.v3.WithTestDefaultsRunner;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(WithTestDefaultsRunner.class)
public class ConsoleSonarPluginTest {

  SonarConnectionMock connection;
  SonarResponderMock responder;

  @Before
  public void setup() throws Exception {
    JavascriptEnvironment jsEnvironment = new JavascriptEnvironment();
    final ConsoleSonarPlugin plugin = new ConsoleSonarPlugin(jsEnvironment);
    connection = new SonarConnectionMock();
    responder = new SonarResponderMock();
    plugin.onConnect(connection);
  }

  @Test
  public void simpleExpressionShouldEvaluateCorrectly() throws Exception {

    receiveScript("2 + 2");
    assertThat(
        responder.successes,
        hasItem(new SonarObject.Builder().put("value", 4).put("type", "json").build()));
  }

  private void receiveScript(String a) throws Exception {
    SonarObject getValue = new SonarObject.Builder().put("command", a).build();
    connection.receivers.get("executeCommand").onReceive(getValue, responder);
  }
}
