/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.android;

import com.facebook.flipper.BuildConfig;
import com.facebook.jni.HybridClassBase;
import com.facebook.proguard.annotations.DoNotStrip;
import com.facebook.soloader.SoLoader;

@DoNotStrip
class EventBase extends HybridClassBase {
  static {
    if (BuildConfig.IS_INTERNAL_BUILD || BuildConfig.LOAD_FLIPPER_EXPLICIT) {
      SoLoader.loadLibrary("flipper");
    }
  }

  EventBase() {
    initHybrid();
  }

  @DoNotStrip
  native void loopForever();

  @DoNotStrip
  private native void initHybrid();
}
