/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.android;

import com.facebook.flipper.BuildConfig;
import com.facebook.flipper.core.FlipperArray;
import com.facebook.flipper.core.FlipperConnection;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.core.FlipperReceiver;
import com.facebook.jni.HybridData;
import com.facebook.proguard.annotations.DoNotStrip;
import com.facebook.soloader.SoLoader;

@DoNotStrip
class FlipperConnectionImpl implements FlipperConnection {
  static {
    if (BuildConfig.IS_INTERNAL_BUILD || BuildConfig.LOAD_FLIPPER_EXPLICIT) {
      SoLoader.loadLibrary("flipper");
    }
  }

  private final HybridData mHybridData;

  private FlipperConnectionImpl(HybridData hd) {
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
  public native void reportErrorWithMetadata(String reason, String stackTrace);

  @Override
  public native void reportError(Throwable throwable);

  @Override
  public native void receive(String method, FlipperReceiver receiver);
}
