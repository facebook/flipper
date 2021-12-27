/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.sample;

/** No-op implementation of an ad-hoc interface. See debug/ for the real implementation. */
public class NavigationFacade {
  private NavigationFacade() {}

  public static void sendNavigationEvent(String value) {
    // no-nop
  }
}
