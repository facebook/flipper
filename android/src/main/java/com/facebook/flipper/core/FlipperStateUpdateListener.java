/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.core;

public interface FlipperStateUpdateListener {

  /**
   * Called when the state of the Flipper client changes. Typical implementations will subscribe by
   * calling {@link com.facebook.flipper.core.FlipperClient#subscribeForUpdates()}, to start
   * receiving update events. Calling {@link com.facebook.flipper.core.FlipperClient#getState()}
   * will retrieve the updated state.
   */
  void onUpdate();
}
