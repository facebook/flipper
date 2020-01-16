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
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.core.FlipperResponder;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.json.JSONTokener;

/**
 * This class manages all loaded FlipperPlugins. It is a singleton to make sure plugin states are
 * preserved even when the native modules get reloaded (e.g. due to a reload in RN). This avoids
 * loosing our connections with Flipper.
 *
 * <p>Note that this manager is not bound to a specific FlipperModule instance, as that might be
 * swapped in and out over time.
 */
public class FlipperReactNativeJavaScriptPluginManager {
  static FlipperReactNativeJavaScriptPluginManager instance;

  static FlipperReactNativeJavaScriptPluginManager getInstance() {
    if (instance == null) {
      instance = new FlipperReactNativeJavaScriptPluginManager();
    }
    return instance;
  }

  private final FlipperClient flipperClient;

  // uniqueResponderId -> ResponderObject
  private final Map<String, FlipperResponder> responders = new ConcurrentHashMap<>();
  // generated the next responder id
  private final AtomicLong responderId = new AtomicLong();

  private FlipperReactNativeJavaScriptPluginManager() {
    instance = this;
    this.flipperClient = AndroidFlipperClient.getInstanceIfInitialized();
  }

  public void registerPlugin(
      FlipperModule module, final String pluginId, final Boolean inBackground) {
    FlipperReactNativeJavaScriptPlugin existing = getPlugin(pluginId);
    if (existing != null) {
      // Make sure events are emitted on the right application context
      existing.setModule(module);
      // this happens if the plugin hot reloaded on JS side, but we had it here already
      if (existing.isConnected()) {
        existing.fireOnConnect();
      }
      return;
    }
    // we always create a new plugin class on the fly,
    // as Flipper only allows one plugin per type to be registered!
    FlipperReactNativeJavaScriptPlugin plugin =
        new FlipperReactNativeJavaScriptPlugin(module, pluginId, inBackground) {
          // inner class with no new members
        };
    this.flipperClient.addPlugin(plugin);
  }

  public void send(String pluginId, String method, String data) {
    // Optimization: throwing raw strings around to the desktop would probably avoid some double
    // parsing...
    Object parsedData = parseJSON(data);
    FlipperReactNativeJavaScriptPlugin plugin = getPlugin(pluginId);
    if (parsedData instanceof FlipperArray) {
      plugin.getConnection().send(method, (FlipperArray) parsedData);
    } else {
      plugin.getConnection().send(method, (FlipperObject) parsedData);
    }
  }

  public void reportErrorWithMetadata(String pluginId, String reason, String stackTrace) {
    getPlugin(pluginId).getConnection().reportErrorWithMetadata(reason, stackTrace);
  }

  public void reportError(String pluginId, String error) {
    getPlugin(pluginId).getConnection().reportError(new Error(error));
  }

  public void subscribe(FlipperModule module, String pluginId, String method) {
    String key = pluginId + "#" + method;
    FlipperReactNativeJavaScriptReceiver receiver =
        new FlipperReactNativeJavaScriptReceiver(this, module, pluginId, method);
    // Fresh connection should be the case for a new subscribe...
    getPlugin(pluginId).getConnection().receive(method, receiver);
  }

  public void respondSuccess(String responderId, String data) {
    FlipperResponder responder = responders.remove(responderId);
    if (data == null) {
      responder.success();
    } else {
      Object parsedData = parseJSON(data);
      if (parsedData instanceof FlipperArray) {
        responder.success((FlipperArray) parsedData);
      } else {
        responder.success((FlipperObject) parsedData);
      }
    }
  }

  public void respondError(String responderId, String data) {
    FlipperResponder responder = responders.remove(responderId);
    Object parsedData = parseJSON(data);
    if (parsedData instanceof FlipperArray) {
      responder.success((FlipperArray) parsedData);
    } else {
      responder.success((FlipperObject) parsedData);
    }
  }

  FlipperReactNativeJavaScriptPlugin getPlugin(String pluginId) {
    return this.flipperClient.<FlipperReactNativeJavaScriptPlugin>getPlugin(pluginId);
  }

  public String createResponderId(FlipperResponder responder) {
    String id = String.valueOf(responderId.incrementAndGet());
    responders.put(id, responder);
    return id;
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
