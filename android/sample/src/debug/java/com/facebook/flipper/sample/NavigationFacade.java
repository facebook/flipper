/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.sample;

import com.facebook.flipper.plugins.navigation.NavigationFlipperPlugin;

/** Limited interface to the navigation plugin which is only available for debug builds. */
public class NavigationFacade {
  private NavigationFacade() {}

  public static void sendNavigationEvent(String value) {
    NavigationFlipperPlugin.getInstance().sendNavigationEvent(value);
  }
}
