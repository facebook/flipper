/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the LICENSE
 * file in the root directory of this source tree.
 */
package com.facebook.flipper.plugins.sections;

import com.facebook.flipper.core.FlipperConnection;
import com.facebook.flipper.core.FlipperPlugin;

public class SectionsFlipperPlugin implements FlipperPlugin {

  private FlipperConnection mConnection;

  @Override
  public String getId() {
    return "Sections";
  }

  @Override
  public void onConnect(FlipperConnection connection) throws Exception {
    mConnection = connection;
  }

  @Override
  public void onDisconnect() throws Exception {}

  @Override
  public boolean runInBackground() {
    return false;
  }
}
