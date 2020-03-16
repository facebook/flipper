/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

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
