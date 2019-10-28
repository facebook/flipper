/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.android;

import android.content.Context;
import com.facebook.flipper.core.FlipperClient;

public final class AndroidFlipperClient {
  public static FlipperClient getInstance(Context context) {
    return new NoOpAndroidFlipperClient();
  }

  public static FlipperClient getInstanceIfInitialized() {
    return new NoOpAndroidFlipperClient();
  }
}
