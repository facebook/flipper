// Copyright 2004-present Facebook. All Rights Reserved.

package com.facebook.flipper.plugins.qpl.api;

public class PerfLoggerDelegateInstaller {
  public static void install(PerfLoggerDelegate delegate) {
    FlipperPerfLogger.setDelegate(delegate);
  }
}
