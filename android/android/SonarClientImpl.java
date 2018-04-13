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
      EventBase eventBase,
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
}
