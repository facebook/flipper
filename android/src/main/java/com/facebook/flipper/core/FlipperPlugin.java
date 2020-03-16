/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.core;

/**
 * A FlipperPlugin is an object which exposes an API to the Desktop Flipper application. When a
 * connection is established the plugin is given a FlipperConnection on which it can register
 * request handlers and send messages. When the FlipperConnection is invalid onDisconnect is called.
 * onConnect may be called again on the same plugin object if Flipper re-connects, this will provide
 * a new FlipperConnection, do not attempt to re-use the previous connection.
 */
public interface FlipperPlugin {

  /**
   * @return The id of this plugin. This is the namespace which Flipper desktop plugins will call
   *     methods on to route them to your plugin. This should match the id specified in your React
   *     plugin.
   */
  String getId();

  /**
   * Called when a connection has been established. The connection passed to this method is valid
   * until {@link FlipperPlugin#onDisconnect()} is called.
   */
  void onConnect(FlipperConnection connection) throws Exception;

  /**
   * Called when the connection passed to {@link FlipperPlugin#onConnect(FlipperConnection)} is no
   * longer valid. Do not try to use the connection in or after this method has been called.
   */
  void onDisconnect() throws Exception;

  /**
   * Returns true if the plugin is meant to be run in background too, otherwise it returns false.
   */
  boolean runInBackground();
}
