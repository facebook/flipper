/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
package com.facebook.sonar.android;

import com.facebook.jni.HybridData;
import com.facebook.proguard.annotations.DoNotStrip;
import com.facebook.soloader.SoLoader;
import com.facebook.sonar.BuildConfig;
import com.facebook.sonar.core.SonarClient;
import com.facebook.sonar.core.SonarPlugin;
import com.facebook.sonar.core.SonarStateUpdateListener;
import com.facebook.sonar.core.StateSummary;

@DoNotStrip
class SonarClientImpl implements SonarClient {
  static {
    if (BuildConfig.IS_INTERNAL_BUILD) {
      SoLoader.loadLibrary("sonar");
    }
  }

  private final HybridData mHybridData;

  private SonarClientImpl(HybridData hd) {
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

  public static native SonarClientImpl getInstance();

  @Override
  public native void addPlugin(SonarPlugin plugin);

  @Override
  public native <T extends SonarPlugin> T getPlugin(String id);

  @Override
  public native void removePlugin(SonarPlugin plugin);

  @Override
  public native void start();

  @Override
  public native void stop();

  @Override
  public native void subscribeForUpdates(SonarStateUpdateListener stateListener);

  @Override
  public native void unsubscribe();

  @Override
  public native String getState();

  @Override
  public native StateSummary getStateSummary();
}
