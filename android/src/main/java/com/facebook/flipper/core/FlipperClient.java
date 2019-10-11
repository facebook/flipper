/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.core;

import javax.annotation.Nullable;

public interface FlipperClient {
  void addPlugin(FlipperPlugin plugin);

  @Nullable
  <T extends FlipperPlugin> T getPlugin(String id);

  @Nullable
  <T extends FlipperPlugin> T getPluginByClass(Class<T> cls);

  void removePlugin(FlipperPlugin plugin);

  void start();

  void stop();

  void subscribeForUpdates(FlipperStateUpdateListener stateListener);

  void unsubscribe();

  String getState();

  StateSummary getStateSummary();
}
