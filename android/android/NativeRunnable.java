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

@DoNotStrip
class NativeRunnable implements Runnable {
  static {
    if (BuildConfig.IS_INTERNAL_BUILD) {
      SoLoader.loadLibrary("sonar");
    }
  }

  private final HybridData mHybridData;

  private NativeRunnable(HybridData hd) {
    mHybridData = hd;
  }

  @Override
  public native void run();
}
