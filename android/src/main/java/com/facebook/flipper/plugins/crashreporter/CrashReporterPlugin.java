/*
 *  Copyright (c) Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
package com.facebook.flipper.plugins.crashreporter;

import android.app.Activity;
import android.support.annotation.Nullable;
import com.facebook.flipper.core.FlipperArray;
import com.facebook.flipper.core.FlipperConnection;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.core.FlipperPlugin;

public class CrashReporterPlugin implements FlipperPlugin {
  public static final String ID = "CrashReporter";

  @Nullable private Activity mActivity;

  @Nullable private FlipperConnection mConnection;

  @Nullable private Thread.UncaughtExceptionHandler prevHandler;

  /*
   * Activity to be used to display incoming messages
   */
  public void setActivity(Activity activity) {
    mActivity = activity;
  }

  @Override
  public void onConnect(FlipperConnection connection) {
    mConnection = connection;
    prevHandler = Thread.getDefaultUncaughtExceptionHandler();
    Thread.setDefaultUncaughtExceptionHandler(
        new Thread.UncaughtExceptionHandler() {
          @Override
          public void uncaughtException(Thread paramThread, Throwable paramThrowable) {
            if (mConnection != null) {
              FlipperConnection connection = mConnection;
              FlipperArray.Builder builder = new FlipperArray.Builder();
              for (StackTraceElement stackTraceElement : paramThrowable.getStackTrace()) {
                builder.put(stackTraceElement.toString());
              }
              FlipperArray arr = builder.build();
              connection.send(
                  "crash-report",
                  new FlipperObject.Builder()
                      .put("callstack", arr)
                      .put("name", paramThrowable.toString())
                      .put("reason", paramThrowable.getMessage())
                      .build());
            }
            if (prevHandler != null) {
              prevHandler.uncaughtException(paramThread, paramThrowable);
            }
          }
        });
  }

  @Override
  public void onDisconnect() {
    mConnection = null;
    Thread.setDefaultUncaughtExceptionHandler(prevHandler);
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
