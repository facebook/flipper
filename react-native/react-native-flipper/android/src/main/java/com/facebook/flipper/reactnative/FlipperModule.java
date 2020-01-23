/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.reactnative;

import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.module.annotations.ReactModule;
import com.facebook.react.modules.core.DeviceEventManagerModule;

/**
 * The FlipperModule is a React Native Native Module. The instance handles incoming calls that
 * arrive over the React Native bridge from JavaScript. The instance is created per
 * ReactApplicationContext. Which means this module gets reinstated if RN performs a reload. So it
 * should not hold any further state on its own. All state is hold by the Plugin and PluginManager
 * classes.
 */
@ReactModule(name = FlipperModule.NAME)
public class FlipperModule extends ReactContextBaseJavaModule {

  public static final String NAME = "Flipper";

  private FlipperReactNativeJavaScriptPluginManager manager;

  public FlipperModule(
      FlipperReactNativeJavaScriptPluginManager manager, ReactApplicationContext reactContext) {
    super(reactContext);
    this.manager = manager;
  }

  @Override
  public String getName() {
    return NAME;
  }

  @ReactMethod
  public void registerPlugin(
      final String pluginId, final Boolean inBackground, final Callback statusCallback) {
    this.manager.registerPlugin(this, pluginId, inBackground, statusCallback);
  }

  @ReactMethod
  public void send(String pluginId, String method, String data) {
    this.manager.send(pluginId, method, data);
  }

  @ReactMethod
  public void reportErrorWithMetadata(String pluginId, String reason, String stackTrace) {
    this.manager.reportErrorWithMetadata(pluginId, reason, stackTrace);
  }

  @ReactMethod
  public void reportError(String pluginId, String error) {
    this.manager.reportError(pluginId, error);
  }

  @ReactMethod
  public void subscribe(String pluginId, String method) {
    this.manager.subscribe(this, pluginId, method);
  }

  @ReactMethod
  public void respondSuccess(String responderId, String data) {
    this.manager.respondSuccess(responderId, data);
  }

  @ReactMethod
  public void respondError(String responderId, String data) {
    this.manager.respondError(responderId, data);
  }

  public void sendJSEvent(String eventName, WritableMap params) {
    ReactApplicationContext context = getReactApplicationContextIfActiveOrWarn();
    if (context != null) {
      context
          .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
          .emit(eventName, params);
    }
  }
}
