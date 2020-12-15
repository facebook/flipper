/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.android;

import com.facebook.flipper.BuildConfig;
import com.facebook.flipper.core.FlipperArray;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.core.FlipperResponder;
import com.facebook.jni.HybridData;
import com.facebook.proguard.annotations.DoNotStrip;
import com.facebook.soloader.SoLoader;

@DoNotStrip
class FlipperResponderImpl implements FlipperResponder {
  static {
    if (BuildConfig.IS_INTERNAL_BUILD || BuildConfig.LOAD_FLIPPER_EXPLICIT) {
      SoLoader.loadLibrary("flipper");
    }
  }

  private final HybridData mHybridData;

  private FlipperResponderImpl(HybridData hd) {
    mHybridData = hd;
  }

  @Override
  public void success(FlipperObject params) {
    successObject(params);
  }

  @Override
  public void success(FlipperArray params) {
    successArray(params);
  }

  @Override
  public void success() {
    successObject(new FlipperObject.Builder().build());
  }

  public native void successObject(FlipperObject response);

  public native void successArray(FlipperArray response);

  @Override
  public native void error(FlipperObject response);
}
