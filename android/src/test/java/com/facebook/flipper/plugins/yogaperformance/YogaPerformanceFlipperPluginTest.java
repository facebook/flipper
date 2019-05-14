/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
package com.facebook.flipper.plugins.yogaperformance;

import static org.hamcrest.CoreMatchers.hasItem;
import static org.hamcrest.MatcherAssert.assertThat;

import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.testing.FlipperConnectionMock;
import com.facebook.flipper.testing.FlipperResponderMock;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;

@RunWith(RobolectricTestRunner.class)
public class YogaPerformanceFlipperPluginTest {

  @Test
  public void greetingTest() throws Exception {
    final YogaPerformanceFlipperPlugin plugin = new YogaPerformanceFlipperPlugin();
    final FlipperConnectionMock connection = new FlipperConnectionMock();
    final FlipperResponderMock responder = new FlipperResponderMock();

    plugin.onConnect(connection);
    connection.receivers.get("greet").onReceive(null, responder);

    assertThat(
        responder.successes, hasItem(new FlipperObject.Builder().put("greeting", "Hello").build()));
  }
}

/* @scarf-info: used for tracking scarf generated files, do not remove */
/* @scarf-generated: flipper-plugin android/test/PluginTest.java 39408df4-f875-4b87-9d8a-21d310226532 */
