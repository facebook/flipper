/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
package com.facebook.flipper.android;

import com.facebook.jni.HybridData;
import com.facebook.proguard.annotations.DoNotStrip;
import com.facebook.soloader.SoLoader;
import com.facebook.flipper.BuildConfig;
import com.facebook.flipper.core.FlipperArray;
import com.facebook.flipper.core.FlipperConnection;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.core.FlipperReceiver;

@DoNotStrip
class SonarConnectionImpl implements FlipperConnection {
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
  public void send(String method, FlipperObject params) {
    sendObject(method, params);
  }

  @Override
  public void send(String method, FlipperArray params) {
    sendArray(method, params);
  }

  public native void sendObject(String method, FlipperObject params);

  public native void sendArray(String method, FlipperArray params);

  @Override
  public native void reportError(Throwable throwable);

  @Override
  public native void receive(String method, FlipperReceiver receiver);
}
