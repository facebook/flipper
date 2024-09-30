/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.core;

import java.util.List;

/**
 * A FlipperMultiPlugin is an object containing several plugins with the same identifiers exposeing
 * an API to the Desktop Flipper application.
 */
public class FlipperMultiPlugin implements FlipperPlugin {
  private List<FlipperPlugin> plugins;

  public FlipperMultiPlugin(List<FlipperPlugin> plugins) {
    this.plugins = plugins;
    // Assert that all plugins have the same identifier.
    String expectedIdentifier = plugins.get(0).getId();
    boolean expectedRunInBackground = plugins.get(0).runInBackground();
    for (FlipperPlugin plugin : plugins) {
      assert plugin.getId().equals(expectedIdentifier);
      assert plugin.runInBackground() == expectedRunInBackground;
    }
  }

  public void addPlugin(FlipperPlugin plugin) {
    // Assert that the new plugin has the same identifier as the existing plugins.
    assert plugin.getId().equals(plugins.get(0).getId());
    assert plugin.runInBackground() == plugins.get(0).runInBackground();
    plugins.add(plugin);
  }

  @Override
  public String getId() {
    return plugins.get(0).getId();
  }

  @Override
  public void onConnect(FlipperConnection conn) throws Exception {
    // Forward the connection to each plugin.
    for (FlipperPlugin plugin : plugins) {
      plugin.onConnect(conn);
    }
  }

  @Override
  public void onDisconnect() throws Exception {
    // Forward the disconnection to each plugin.
    for (FlipperPlugin plugin : plugins) {
      plugin.onDisconnect();
    }
  }

  @Override
  public boolean runInBackground() {
    // Check if any of the plugins need to run in the background.
    for (FlipperPlugin plugin : plugins) {
      if (plugin.runInBackground()) {
        return true;
      }
    }
    return false;
  }
}
