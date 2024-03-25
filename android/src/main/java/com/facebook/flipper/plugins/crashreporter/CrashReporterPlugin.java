/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.crashreporter;

import android.app.Activity;
import androidx.annotation.Nullable;
import com.facebook.flipper.core.FlipperConnection;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.core.FlipperPlugin;

public class CrashReporterPlugin implements FlipperPlugin {
  public static final String ID = "CrashReporter";

  @Nullable private Activity mActivity;

  @Nullable private FlipperConnection mConnection;

  @Nullable private Thread.UncaughtExceptionHandler prevHandler;
  private static CrashReporterPlugin crashreporterPlugin = null;

  private CrashReporterPlugin() {}

  // static method to create instance of Singleton class
  public static CrashReporterPlugin getInstance() {
    if (crashreporterPlugin == null) crashreporterPlugin = new CrashReporterPlugin();

    return crashreporterPlugin;
  }

  /*
   * Activity to be used to display incoming messages
   */
  public void setActivity(Activity activity) {
    mActivity = activity;
  }

  @Override
  public void onConnect(FlipperConnection connection) {
    mConnection = connection;
  }

  // This function is called from Litho's error boundary.
  public void sendExceptionMessage(Thread paramThread, Throwable paramThrowable) {
    if (mConnection != null) {
      FlipperConnection connection = mConnection;
      StringBuilder strBuilder = new StringBuilder("");
      StackTraceElement[] elems = paramThrowable.getStackTrace();
      for (int i = 0; i < elems.length; ++i) {
        strBuilder.append(elems[i].toString());
        if (i < elems.length - 1) {
          strBuilder.append("\n\tat ");
        }
      }
      connection.send(
          "crash-report",
          new FlipperObject.Builder()
              .put("callstack", strBuilder.toString())
              .put("name", paramThrowable.toString())
              .put("reason", paramThrowable.getMessage())
              .build());
    }
  }

  @Override
  public void onDisconnect() {
    mConnection = null;
  }

  @Override
  public boolean runInBackground() {
    return true;
  }

  @Override
  public String getId() {
    return ID;
  }
}
