/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.android;

import com.facebook.flipper.BuildConfig;
import com.facebook.flipper.core.FlipperClient;
import com.facebook.flipper.core.FlipperPlugin;
import com.facebook.flipper.core.FlipperStateUpdateListener;
import com.facebook.flipper.core.StateSummary;
import com.facebook.jni.HybridData;
import com.facebook.proguard.annotations.DoNotStrip;
import com.facebook.soloader.SoLoader;
import java.util.HashMap;
import java.util.Map;
import javax.annotation.Nullable;

@DoNotStrip
class FlipperClientImpl implements FlipperClient {
  static {
    if (BuildConfig.IS_INTERNAL_BUILD || BuildConfig.LOAD_FLIPPER_EXPLICIT) {
      SoLoader.loadLibrary("flipper");
    }
  }

  private final HybridData mHybridData;
  private final Map<Class<?>, String> mClassIdentifierMap = new HashMap<>(8);

  private FlipperClientImpl(HybridData hd) {
    mHybridData = hd;
  }

  public static native void init(
      EventBase callbackWorker,
      EventBase connectionWorker,
      int insecurePort,
      int securePort,
      String host,
      String os,
      String device,
      String deviceId,
      String app,
      String appId,
      String privateAppDirectory);

  public static native FlipperClientImpl getInstance();

  @Override
  public void addPlugin(FlipperPlugin plugin) {
    mClassIdentifierMap.put(plugin.getClass(), plugin.getId());
    addPluginNative(plugin);
  }

  public native void addPluginNative(FlipperPlugin plugin);

  /**
   * @deprecated Prefer using {@link #getPluginByClass(Class)} over the stringly-typed interface.
   */
  @Override
  @Nullable
  @Deprecated
  public native <T extends FlipperPlugin> T getPlugin(String id);

  @Nullable
  @Override
  public <T extends FlipperPlugin> T getPluginByClass(Class<T> cls) {
    final String id = mClassIdentifierMap.get(cls);
    //noinspection deprecation
    return getPlugin(id);
  }

  public native void removePluginNative(FlipperPlugin plugin);

  @Override
  public void removePlugin(FlipperPlugin plugin) {
    mClassIdentifierMap.remove(plugin.getClass());
    removePluginNative(plugin);
  }

  @Override
  public native void start();

  @Override
  public native void stop();

  @Override
  public native void subscribeForUpdates(FlipperStateUpdateListener stateListener);

  @Override
  public native void unsubscribe();

  @Override
  public native String getState();

  @Override
  public native StateSummary getStateSummary();
}
