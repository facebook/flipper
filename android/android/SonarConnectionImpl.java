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
import com.facebook.sonar.core.SonarArray;
import com.facebook.sonar.core.SonarConnection;
import com.facebook.sonar.core.SonarObject;
import com.facebook.sonar.core.SonarReceiver;

@DoNotStrip
class SonarConnectionImpl implements SonarConnection {
  static {
    if (BuildConfig.IS_INTERNAL_BUILD) {
      SoLoader.loadLibrary("sonar");
    }
  }

  private final HybridData mHybridData;

  private SonarConnectionImpl(HybridData hd) {
    mHybridData = hd;
  }

  @Override
  public void send(String method, SonarObject params) {
    sendObject(method, params);
  }

  @Override
  public void send(String method, SonarArray params) {
    sendArray(method, params);
  }

  public native void sendObject(String method, SonarObject params);

  public native void sendArray(String method, SonarArray params);

  @Override
  public native void reportError(Throwable throwable);

  @Override
  public native void receive(String method, SonarReceiver receiver);
}
