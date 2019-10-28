/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.common;

import android.os.Handler;
import android.os.Looper;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.core.FlipperReceiver;
import com.facebook.flipper.core.FlipperResponder;
import java.io.PrintWriter;
import java.io.StringWriter;

public abstract class MainThreadFlipperReceiver implements FlipperReceiver {

  private final Handler mHandler = new Handler(Looper.getMainLooper());

  @Override
  public final void onReceive(final FlipperObject params, final FlipperResponder responder) {
    mHandler.post(
        new Runnable() {
          @Override
          public void run() {
            try {
              onReceiveOnMainThread(params, responder);
            } catch (Exception ex) {
              responder.error(
                  new FlipperObject.Builder()
                      .put("name", ex.getClass().getCanonicalName())
                      .put("message", ex.getMessage())
                      .put("stacktrace", getStackTraceString(ex))
                      .build());
            }
          }
        });
  }

  private static String getStackTraceString(Throwable th) {
    StringWriter stringWriter = new StringWriter();
    th.printStackTrace(new PrintWriter(stringWriter));
    return stringWriter.toString();
  }

  public abstract void onReceiveOnMainThread(FlipperObject params, FlipperResponder responder)
      throws Exception;
}
