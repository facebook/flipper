// Copyright 2004-present Facebook. All Rights Reserved.

package com.facebook.flipper.plugins.fresco;

public interface FrescoFlipperDebugPrefHelper {

  interface Listener {
    void onEnabledStatusChanged(boolean enabled);
  }

  void setDebugOverlayEnabled(boolean enabled);

  boolean isDebugOverlayEnabled();

  void setDebugOverlayEnabledListener(Listener l);
}
