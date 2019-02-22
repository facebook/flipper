/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
package com.facebook.flipper.plugins.react;

import androidx.annotation.Nullable;
import com.facebook.flipper.core.FlipperConnection;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.core.FlipperPlugin;
import com.facebook.flipper.core.FlipperReceiver;
import com.facebook.flipper.core.FlipperResponder;

public class ReactFlipperPlugin implements FlipperPlugin {

  public static final String ID = "React";
  @Nullable private FlipperConnection mConnection;

  @Override
  public String getId() {
    return ID;
  }

  @Override
  public void onConnect(FlipperConnection connection) {
    mConnection = connection;
    connection.receive(
        "config",
        new FlipperReceiver() {
          @Override
          public void onReceive(final FlipperObject params, FlipperResponder responder) {
            // set received host and port in react-native
          }
        });
  }

  @Override
  public void onDisconnect() {
    mConnection = null;
  }

  @Override
  public boolean runInBackground() {
    return true;
  }
}
