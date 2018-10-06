/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
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

@DoNotStrip
class FlipperClientImpl implements FlipperClient {
  static {
    if (BuildConfig.IS_INTERNAL_BUILD) {
      SoLoader.loadLibrary("flipper");
    }
  }

  private final HybridData mHybridData;

  private FlipperClientImpl(HybridData hd) {
    mHybridData = hd;
  }

  public static native void init(
      EventBase callbackWorker,
      EventBase connectionWorker,
      String host,
      String os,
      String device,
      String deviceId,
      String app,
      String appId,
      String privateAppDirectory);

  public static native FlipperClientImpl getInstance();

  @Override
  public native void addPlugin(FlipperPlugin plugin);

  @Override
  public native <T extends FlipperPlugin> T getPlugin(String id);

  @Override
  public native void removePlugin(FlipperPlugin plugin);

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
