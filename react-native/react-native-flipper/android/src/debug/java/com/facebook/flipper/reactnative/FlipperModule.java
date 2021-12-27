/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
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
import javax.annotation.Nonnull;

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

  private final FlipperReactNativeJavaScriptPluginManager mManager;

  public FlipperModule(
      FlipperReactNativeJavaScriptPluginManager manager, ReactApplicationContext reactContext) {
    super(reactContext);
    mManager = manager;
  }

  @Override
  @Nonnull
  public String getName() {
    return NAME;
  }

  @ReactMethod
  public void registerPlugin(
      final String pluginId, final Boolean inBackground, final Callback statusCallback) {
    mManager.registerPlugin(this, pluginId, inBackground, statusCallback);
  }

  @ReactMethod
  public void send(String pluginId, String method, String data) {
    mManager.send(pluginId, method, data);
  }

  @ReactMethod
  public void reportErrorWithMetadata(String pluginId, String reason, String stackTrace) {
    mManager.reportErrorWithMetadata(pluginId, reason, stackTrace);
  }

  @ReactMethod
  public void reportError(String pluginId, String error) {
    mManager.reportError(pluginId, error);
  }

  @ReactMethod
  public void subscribe(String pluginId, String method) {
    mManager.subscribe(this, pluginId, method);
  }

  @ReactMethod
  public void respondSuccess(String responderId, String data) {
    mManager.respondSuccess(responderId, data);
  }

  @ReactMethod
  public void respondError(String responderId, String data) {
    mManager.respondError(responderId, data);
  }

  @ReactMethod
  public void addListener(String eventName) {
    // Set up any upstream listeners or background tasks as necessary
  }

  @ReactMethod
  public void removeListeners(Integer count) {
    // Remove upstream listeners, stop unnecessary background tasks
  }

  void sendJSEvent(String eventName, WritableMap params) {
    final ReactApplicationContext context = getReactApplicationContextIfActiveOrWarn();
    if (context != null) {
      context
          .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
          .emit(eventName, params);
    }
  }
}
