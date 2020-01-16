/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.reactnative;

import com.facebook.flipper.android.AndroidFlipperClient;
import com.facebook.flipper.core.FlipperArray;
import com.facebook.flipper.core.FlipperClient;
import com.facebook.flipper.core.FlipperConnection;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.core.FlipperPlugin;
import com.facebook.flipper.core.FlipperReceiver;
import com.facebook.flipper.core.FlipperResponder;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.module.annotations.ReactModule;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.json.JSONTokener;

@ReactModule(name = FlipperModule.NAME)
public class FlipperModule extends ReactContextBaseJavaModule {

  public static final String NAME = "Flipper";

  private final ReactApplicationContext reactContext;
  private final FlipperClient flipperClient;
  private final Map<String, FlipperConnection> connections;
  private final Map<String, FlipperResponder> responders;
  private final AtomicLong responderId = new AtomicLong();

  public FlipperModule(ReactApplicationContext reactContext) {
    super(reactContext);
    this.reactContext = reactContext;
    this.flipperClient = AndroidFlipperClient.getInstanceIfInitialized();
    this.connections = new ConcurrentHashMap<>();
    this.responders = new ConcurrentHashMap<>();
  }

  @Override
  public String getName() {
    return NAME;
  }

  @ReactMethod
  public void registerPlugin(
      final String pluginId,
      final Boolean inBackground,
      final Callback onConnect,
      final Callback onDisconnect) {
    FlipperPlugin plugin =
        new FlipperPlugin() {
          @Override
          public String getId() {
            return pluginId;
          }

          @Override
          public void onConnect(FlipperConnection connection) throws Exception {
            FlipperModule.this.connections.put(pluginId, connection);
            onConnect.invoke();
          }

          @Override
          public void onDisconnect() throws Exception {
            FlipperModule.this.connections.remove(pluginId);
            onDisconnect.invoke();
          }

          @Override
          public boolean runInBackground() {
            return inBackground;
          }
        };
    this.flipperClient.addPlugin(plugin);
  }

  @ReactMethod
  public void send(String pluginId, String method, String data) {
    // Optimization: throwing raw strings around to the desktop would probably avoid some double
    // parsing...
    Object parsedData = FlipperModule.parseJSON(data);
    FlipperConnection connection = this.connections.get(pluginId);
    if (parsedData instanceof FlipperArray) {
      connection.send(method, (FlipperArray) parsedData);
    } else {
      connection.send(method, (FlipperObject) parsedData);
    }
  }

  @ReactMethod
  public void reportErrorWithMetadata(String pluginId, String reason, String stackTrace) {
    this.connections.get(pluginId).reportErrorWithMetadata(reason, stackTrace);
  }

  @ReactMethod
  public void reportError(String pluginId, String error) {
    this.connections.get(pluginId).reportError(new Error(error));
  }

  @ReactMethod
  public void subscribe(String pluginId, String method, final Callback callback) {
    this.connections
        .get(pluginId)
        .receive(
            method,
            new FlipperReceiver() {

              @Override
              public void onReceive(FlipperObject params, FlipperResponder responder)
                  throws Exception {
                String id = String.valueOf(FlipperModule.this.responderId.incrementAndGet());
                FlipperModule.this.responders.put(id, responder);
                callback.invoke(params.toJsonString(), id);
              }
            });
  }

  @ReactMethod
  public void respondSuccess(String responderId, String data) {
    FlipperResponder responder = FlipperModule.this.responders.remove(responderId);
    if (data == null) {
      responder.success();
    } else {
      Object parsedData = FlipperModule.parseJSON(data);
      if (parsedData instanceof FlipperArray) {
        responder.success((FlipperArray) parsedData);
      } else {
        responder.success((FlipperObject) parsedData);
      }
    }
  }

  @ReactMethod
  public void respondError(String responderId, String data) {
    FlipperResponder responder = FlipperModule.this.responders.remove(responderId);
    Object parsedData = FlipperModule.parseJSON(data);
    if (parsedData instanceof FlipperArray) {
      responder.success((FlipperArray) parsedData);
    } else {
      responder.success((FlipperObject) parsedData);
    }
  }

  private static Object /* FlipperArray | FlipperObject */ parseJSON(String json) {
    // returns either a FlipperObject or Flipper array, pending the data
    try {
      JSONTokener tokener = new JSONTokener(json);
      if (tokener.nextClean() == '[') {
        tokener.back();
        return new FlipperArray(new JSONArray(tokener));
      } else {
        tokener.back();
        return new FlipperObject(new JSONObject(tokener));
      }
    } catch (JSONException e) {
      throw new RuntimeException(e);
    }
  }
}
