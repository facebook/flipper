// Copyright 2004-present Facebook. All Rights Reserved.

package com.facebook.flipper.perflogger;

public interface PerfLoggerDelegate {
  void starMarker(String name);

  void endMarker(String name);

  void cancelMarker(String name);
}
