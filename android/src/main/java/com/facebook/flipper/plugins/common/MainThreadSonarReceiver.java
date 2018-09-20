/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
package com.facebook.flipper.plugins.common;

import android.os.Handler;
import android.os.Looper;
import com.facebook.flipper.core.ErrorReportingRunnable;
import com.facebook.flipper.core.FlipperConnection;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.core.FlipperReceiver;
import com.facebook.flipper.core.FlipperResponder;

public abstract class MainThreadSonarReceiver implements FlipperReceiver {

  public MainThreadSonarReceiver(FlipperConnection connection) {
    this.mConnection = connection;
  }

  private final FlipperConnection mConnection;
  private final Handler mHandler = new Handler(Looper.getMainLooper());

  @Override
  public final void onReceive(final FlipperObject params, final FlipperResponder responder) {
    mHandler.post(
        new ErrorReportingRunnable(mConnection) {
          @Override
          public void runOrThrow() throws Exception {
            onReceiveOnMainThread(params, responder);
          }
        });
  }

  public abstract void onReceiveOnMainThread(FlipperObject params, FlipperResponder responder)
      throws Exception;
}
