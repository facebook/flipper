/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.core;

import java.io.PrintWriter;
import java.io.StringWriter;

public abstract class ErrorReportingRunnable implements Runnable {

  private final FlipperConnection mConnection;

  public ErrorReportingRunnable(FlipperConnection connection) {
    mConnection = connection;
  }

  @Override
  public final void run() {
    try {
      runOrThrow();
    } catch (Throwable e) {
      if (mConnection != null) {
        StringWriter sw = new StringWriter();
        PrintWriter pw = new PrintWriter(sw);
        e.printStackTrace(pw);
        String sStackTrace = sw.toString(); // stack trace as a string
        mConnection.reportErrorWithMetadata(e.toString(), sStackTrace);
      }
    } finally {
      doFinally();
    }
  }

  protected void doFinally() {}

  protected abstract void runOrThrow() throws Exception;
}
