/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.android;

import com.facebook.flipper.core.FlipperClient;
import com.facebook.flipper.core.FlipperPlugin;
import javax.annotation.Nullable;

public class NoOpAndroidFlipperClient implements FlipperClient {

  @Override
  public void addPlugin(FlipperPlugin plugin) {
    // no-op
  }

  @Nullable
  @Override
  public <T extends FlipperPlugin> T getPlugin(String id) {
    return null;
  }

  @Nullable
  @Override
  public <T extends FlipperPlugin> T getPluginByClass(Class<T> cls) {
    return null;
  }

  @Override
  public void removePlugin(FlipperPlugin plugin) {
    // no-op
  }

  @Override
  public void start() {
    // no-op
  }

  @Override
  public void stop() {
    // no-op
  }

  @Override
  public void unsubscribe() {
    // no-op
  }
}
