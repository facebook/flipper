/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.navigation;

import androidx.annotation.Nullable;
import com.facebook.flipper.core.FlipperConnection;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.core.FlipperPlugin;
import com.facebook.flipper.core.FlipperReceiver;
import com.facebook.flipper.core.FlipperResponder;
import java.util.Date;

public class NavigationFlipperPlugin implements FlipperPlugin {

  private FlipperConnection mConnection = null;

  @Nullable private static NavigationFlipperPlugin instance = null;

  private NavigationFlipperPlugin() {}

  @Deprecated
  public void sendNavigationEvent(@Nullable String keyURI) {
    sendNavigationEvent(keyURI, null, null);
  }

  public void sendNavigationEvent(
      @Nullable String keyURI, @Nullable String className, @Nullable Date date) {
    if (mConnection != null) {
      FlipperObject sendObject =
          new FlipperObject.Builder()
              .put("uri", keyURI)
              .put("date", date != null ? date : new Date())
              .put("class", className)
              .build();
      mConnection.send("nav_event", sendObject);
    }
  }

  @Override
  public String getId() {
    return "Navigation";
  }

  @Override
  public void onConnect(FlipperConnection connection) throws Exception {
    mConnection = connection;
    connection.receive(
        "greet",
        new FlipperReceiver() {
          @Override
          public void onReceive(FlipperObject params, FlipperResponder responder) throws Exception {
            responder.success(new FlipperObject.Builder().put("greeting", "Hello").build());
          }
        });
    mConnection.send("nav_plugin_active", new FlipperObject.Builder().build());
  }

  @Override
  public void onDisconnect() throws Exception {}

  @Override
  public boolean runInBackground() {
    return true;
  }

  public static NavigationFlipperPlugin getInstance() {
    if (instance == null) {
      instance = new NavigationFlipperPlugin();
    }
    return instance;
  }
}

/* @scarf-info: do not remove, more info: https://fburl.com/scarf */
/* @scarf-generated: flipper-plugin android/Plugin.java 0bfa32e5-fb15-4705-81f8-86260a1f3f8e */
