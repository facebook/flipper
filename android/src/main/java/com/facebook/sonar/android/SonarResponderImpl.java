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
import com.facebook.flipper.core.SonarArray;
import com.facebook.flipper.core.SonarObject;
import com.facebook.flipper.core.SonarResponder;

@DoNotStrip
class SonarResponderImpl implements SonarResponder {
  static {
    if (BuildConfig.IS_INTERNAL_BUILD) {
      SoLoader.loadLibrary("sonar");
    }
  }

  private final HybridData mHybridData;

  private SonarResponderImpl(HybridData hd) {
    mHybridData = hd;
  }

  @Override
  public void success(SonarObject params) {
    successObject(params);
  }

  @Override
  public void success(SonarArray params) {
    successArray(params);
  }

  @Override
  public void success() {
    successObject(new SonarObject.Builder().build());
  }

  public native void successObject(SonarObject response);

  public native void successArray(SonarArray response);

  @Override
  public native void error(SonarObject response);
}
