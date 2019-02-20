// Copyright 2004-present Facebook. All Rights Reserved.

package com.facebook.flipper.perflogger;

import android.support.annotation.Nullable;

public class FlipperPerfLogger {

  @Nullable private static PerfLoggerDelegate mDelegate;

  public static void startMarker(String name) {
    if (mDelegate != null) {
      mDelegate.starMarker(name);
    }
  }

  public static void endMarker(String name) {
    if (mDelegate != null) {
      mDelegate.endMarker(name);
    }
  }

  public static void cancelMarker(String name) {
    if (mDelegate != null) {
      mDelegate.cancelMarker(name);
    }
  }

  static void setDelegate(PerfLoggerDelegate delegate) {
    mDelegate = delegate;
  }
}
