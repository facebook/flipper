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
import com.facebook.flipper.core.SonarConnection;
import com.facebook.flipper.core.SonarObject;
import com.facebook.flipper.core.SonarReceiver;
import com.facebook.flipper.core.SonarResponder;

public abstract class MainThreadSonarReceiver implements SonarReceiver {

  public MainThreadSonarReceiver(SonarConnection connection) {
    this.mConnection = connection;
  }

  private final SonarConnection mConnection;
  private final Handler mHandler = new Handler(Looper.getMainLooper());

  @Override
  public final void onReceive(final SonarObject params, final SonarResponder responder) {
    mHandler.post(
        new ErrorReportingRunnable(mConnection) {
          @Override
          public void runOrThrow() throws Exception {
            onReceiveOnMainThread(params, responder);
          }
        });
  }

  public abstract void onReceiveOnMainThread(SonarObject params, SonarResponder responder)
      throws Exception;
}
