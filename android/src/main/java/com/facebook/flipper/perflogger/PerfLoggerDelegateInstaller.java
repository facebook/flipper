// Copyright 2004-present Facebook. All Rights Reserved.

package com.facebook.flipper.perflogger;

public class PerfLoggerDelegateInstaller {
  public static void install(PerfLoggerDelegate delegate) {
    FlipperPerfLogger.setDelegate(delegate);
  }
}
