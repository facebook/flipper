/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.reactnative;

import com.facebook.flipper.android.AndroidFlipperClient;
import com.facebook.flipper.core.FlipperArray;
import com.facebook.flipper.core.FlipperClient;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.core.FlipperPlugin;
import com.facebook.flipper.core.FlipperResponder;
import com.facebook.react.bridge.Callback;
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
public final class FlipperReactNativeJavaScriptPluginManager {
  private static FlipperReactNativeJavaScriptPluginManager sInstance;

  public static synchronized FlipperReactNativeJavaScriptPluginManager getInstance() {
    if (sInstance == null) {
      sInstance = new FlipperReactNativeJavaScriptPluginManager();
    }
    return sInstance;
  }

  private final FlipperClient mFlipperClient;

  // uniqueResponderId -> ResponderObject
  private final Map<String, FlipperResponder> mResponders = new ConcurrentHashMap<>();
  // generated the next responder id
  private final AtomicLong mResponderId = new AtomicLong();

  private FlipperReactNativeJavaScriptPluginManager() {
    mFlipperClient = AndroidFlipperClient.getInstanceIfInitialized();
  }

  public void registerPlugin(
      FlipperModule module,
      final String pluginId,
      final Boolean inBackground,
      final Callback statusCallback) {
    if (mFlipperClient == null) {
      // Flipper is not available in this build
      statusCallback.invoke("noflipper");
      return;
    }
    final FlipperReactNativeJavaScriptPlugin existing = getPlugin(pluginId);
    if (existing != null) {
      // Make sure events are emitted on the right application context
      existing.setModule(module);
      // this happens if the plugin hot reloaded on JS side, but we had it here already
      if (existing.isConnected()) {
        existing.fireOnConnect();
      }
      statusCallback.invoke("ok");
      return;
    }
    // we always create a new plugin class on the fly,
    // as Flipper only allows one plugin per type to be registered!
    final FlipperPlugin plugin =
        new FlipperReactNativeJavaScriptPlugin(module, pluginId, inBackground) {
          // inner class with no new members
        };
    mFlipperClient.addPlugin(plugin);
    statusCallback.invoke("ok");
  }

  void send(String pluginId, String method, String data) {
    final FlipperReactNativeJavaScriptPlugin plugin = getPlugin(pluginId);
    if (data == null) {
      plugin.getConnection().send(method, (FlipperObject) null);
      return;
    }
    // Optimization: throwing raw strings around to the desktop would probably avoid some double
    // parsing...
    final Object parsedData = parseJSON(data);
    if (parsedData instanceof FlipperArray) {
      plugin.getConnection().send(method, (FlipperArray) parsedData);
    } else {
      plugin.getConnection().send(method, (FlipperObject) parsedData);
    }
  }

  void reportErrorWithMetadata(String pluginId, String reason, String stackTrace) {
    getPlugin(pluginId).getConnection().reportErrorWithMetadata(reason, stackTrace);
  }

  void reportError(String pluginId, String error) {
    getPlugin(pluginId).getConnection().reportError(new Error(error));
  }

  void subscribe(FlipperModule module, String pluginId, String method) {
    final FlipperReactNativeJavaScriptReceiver receiver =
        new FlipperReactNativeJavaScriptReceiver(this, module, pluginId, method);
    // Fresh connection should be the case for a new subscribe...
    getPlugin(pluginId).getConnection().receive(method, receiver);
  }

  void respondSuccess(String responderId, String data) {
    final FlipperResponder responder = mResponders.remove(responderId);
    if (data == null) {
      responder.success();
    } else {
      final Object parsedData = parseJSON(data);
      if (parsedData instanceof FlipperArray) {
        responder.success((FlipperArray) parsedData);
      } else {
        responder.success((FlipperObject) parsedData);
      }
    }
  }

  void respondError(String responderId, String data) {
    final FlipperResponder responder = mResponders.remove(responderId);
    final Object parsedData = parseJSON(data);
    if (parsedData instanceof FlipperArray) {
      responder.success((FlipperArray) parsedData);
    } else {
      responder.success((FlipperObject) parsedData);
    }
  }

  private FlipperReactNativeJavaScriptPlugin getPlugin(String pluginId) {
    return mFlipperClient.getPlugin(pluginId);
  }

  String createResponderId(FlipperResponder responder) {
    final String id = String.valueOf(mResponderId.incrementAndGet());
    mResponders.put(id, responder);
    return id;
  }

  private static Object /* FlipperArray | FlipperObject */ parseJSON(String json) {
    if (json == null) {
      return null;
    }
    // returns either a FlipperObject or Flipper array, pending the data
    try {
      final JSONTokener tokener = new JSONTokener(json);
      final char firstChar = tokener.nextClean();
      tokener.back();
      if (firstChar == '[') {
        return new FlipperArray(new JSONArray(tokener));
      } else {
        return new FlipperObject(new JSONObject(tokener));
      }
    } catch (final JSONException e) {
      throw new RuntimeException(e);
    }
  }
}
