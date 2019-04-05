package com.facebook.flipper.nativeplugins;

import com.facebook.flipper.core.FlipperClient;

public class NativePluginRegistry {

  private final FlipperClient client;

  public NativePluginRegistry(FlipperClient client) {
    this.client = client;
  }

  public void register(final NativePlugin plugin) {
    client.addPlugin(plugin.asFlipperPlugin());
  }
}
