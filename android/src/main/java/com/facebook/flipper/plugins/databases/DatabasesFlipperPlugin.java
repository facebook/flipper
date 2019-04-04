// Copyright 2018-present Facebook. All Rights Reserved.

package com.facebook.flipper.plugins.databases;

import com.facebook.flipper.core.FlipperConnection;
import com.facebook.flipper.core.FlipperPlugin;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.core.FlipperResponder;
import com.facebook.flipper.core.FlipperReceiver;

public class DatabasesFlipperPlugin implements FlipperPlugin {

  @Override
  public String getId() {
    return "Databases";
  }

  @Override
  public void onConnect(FlipperConnection connection) throws Exception {
    connection.receive("greet", new FlipperReceiver() {
      @Override
      public void onReceive(FlipperObject params, FlipperResponder responder) throws Exception {
        responder.success(
            new FlipperObject.Builder()
                .put("greeting", "Hello")
                .build());
      }
    });
  }

  @Override
  public void onDisconnect() throws Exception {}

  @Override
  public boolean runInBackground() {
    return false;
  }
}
