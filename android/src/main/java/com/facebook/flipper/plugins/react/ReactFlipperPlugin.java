/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.react;

import com.facebook.flipper.core.FlipperConnection;
import com.facebook.flipper.core.FlipperPlugin;

// This plugin is not needed, but kept here for backward compatilibty
@Deprecated
public class ReactFlipperPlugin implements FlipperPlugin {

  public static final String ID = "React";

  @Override
  public String getId() {
    return ID;
  }

  @Override
  public void onConnect(FlipperConnection connection) {}

  @Override
  public void onDisconnect() {}

  @Override
  public boolean runInBackground() {
    return true;
  }
}
