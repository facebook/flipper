/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.reactnative;

import com.facebook.flipper.core.FlipperConnection;
import com.facebook.flipper.core.FlipperPlugin;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;

/**
 * This class holds the state of a single plugin that is created from the JS world trough
 * `Flipper.addPlugin`. It's main concern is managing the FlipperConnection to the Desktop client.
 *
 * <p>This class is abstract, as Flipper does not support having multiple instances of the same
 * class as plugins, But every JS plugin will store it state in a FlipperPlugin, so for every plugin
 * we will create an anonymous subclass.
 *
 * <p>Note that this class does not directly interact back over the JS bridge to React Native, as
 * the JavaPlugin has a longer lifecycle than it's JS counter part, which will be recreated on
 * reload. However, if the native module reload, we keep these instances to not loose the connextion
 * to the Flipper Desktop client.
 */
public abstract class FlipperReactNativeJavaScriptPlugin implements FlipperPlugin {
  String pluginId;
  boolean inBackground;
  FlipperConnection connection;
  FlipperModule module;

  public FlipperReactNativeJavaScriptPlugin(
      FlipperModule module, String pluginId, boolean inBackground) {
    this.pluginId = pluginId;
    this.module = module;
    this.inBackground = inBackground;
    this.module = module;
  }

  @Override
  public String getId() {
    return pluginId;
  }

  @Override
  public void onConnect(FlipperConnection connection) throws Exception {
    this.connection = connection;
    this.fireOnConnect();
  }

  public void fireOnConnect() {
    if (!isConnected()) {
      throw new RuntimeException("Plugin not connected " + pluginId);
    }
    this.module.sendJSEvent("react-native-flipper-plugin-connect", getPluginParams());
  }

  @Override
  public void onDisconnect() throws Exception {
    this.module.sendJSEvent("react-native-flipper-plugin-disconnect", getPluginParams());
    this.connection = null;
  }

  @Override
  public boolean runInBackground() {
    return inBackground;
  }

  public boolean isConnected() {
    return connection != null;
  }

  public FlipperConnection getConnection() {
    return connection;
  }

  public void setModule(FlipperModule module) {
    this.module = module;
  }

  WritableMap getPluginParams() {
    WritableMap params = Arguments.createMap();
    params.putString("plugin", pluginId);
    return params;
  }
}
