/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.example;

import android.app.Activity;
import com.facebook.flipper.core.FlipperPlugin;

// No-Op implementation to satisfy the interface.
public class ExampleFlipperPlugin implements FlipperPlugin {
  public void setActivity(Activity a) {
    // no-op
  }
}
