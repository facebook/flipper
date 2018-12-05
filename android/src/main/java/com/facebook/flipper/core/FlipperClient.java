/*
 *  Copyright (c) Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
package com.facebook.flipper.core;

public interface FlipperClient {
  void addPlugin(FlipperPlugin plugin);

  <T extends FlipperPlugin> T getPlugin(String id);

  <T extends FlipperPlugin> T getPluginByClass(Class<T> cls);

  void removePlugin(FlipperPlugin plugin);

  void start();

  void stop();

  void subscribeForUpdates(FlipperStateUpdateListener stateListener);

  void unsubscribe();

  String getState();

  StateSummary getStateSummary();
}
