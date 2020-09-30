/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.common;

import static org.robolectric.annotation.LooperMode.Mode.LEGACY;

import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.core.FlipperResponder;
import com.facebook.flipper.testing.FlipperResponderMock;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.annotation.LooperMode;

@LooperMode(LEGACY)
@RunWith(RobolectricTestRunner.class)
public class MainThreadFlipperReceiverTest {

  FlipperResponderMock responder;

  @Before
  public void setup() throws Exception {
    responder = new FlipperResponderMock();
  }

  @Test
  public void errorIsPassedToResponder() throws Exception {
    MainThreadFlipperReceiver receiver =
        new MainThreadFlipperReceiver() {
          public void onReceiveOnMainThread(FlipperObject params, FlipperResponder responder)
              throws Exception {
            throw new RuntimeException("hello exception");
          }
        };

    receiver.onReceive(new FlipperObject.Builder().build(), responder);

    Assert.assertEquals(1, responder.errors.size());
    FlipperObject error = responder.errors.get(0);
    Assert.assertEquals("hello exception", error.getString("message"));
    Assert.assertEquals("java.lang.RuntimeException", error.getString("name"));
    Assert.assertTrue(
        error.getString("stacktrace").contains(MainThreadFlipperReceiver.class.getCanonicalName()));
  }
}
