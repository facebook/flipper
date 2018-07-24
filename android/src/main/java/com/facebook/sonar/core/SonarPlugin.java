/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
package com.facebook.sonar.core;

/**
 * A SonarPlugin is an object which exposes an API to the Desktop Sonar application. When a
 * connection is established the plugin is given a SonarConnection on which it can register request
 * handlers and send messages. When the SonarConnection is invalid onDisconnect is called. onConnect
 * may be called again on the same plugin object if Sonar re-connects, this will provide a new
 * SonarConnection, do not attempt to re-use the previous connection.
 */
public interface SonarPlugin {

  /**
   * @return The id of this plugin. This is the namespace which Sonar desktop plugins will call
   *     methods on to route them to your plugin. This should match the id specified in your React
   *     plugin.
   */
  String getId();

  /**
   * Called when a connection has been established. The connection passed to this method is valid
   * until {@link SonarPlugin#onDisconnect()} is called.
   */
  void onConnect(SonarConnection connection) throws Exception;

  /**
   * Called when the connection passed to {@link SonarPlugin#onConnect(SonarConnection)} is no
   * longer valid. Do not try to use the connection in or after this method has been called.
   */
  void onDisconnect() throws Exception;
}
