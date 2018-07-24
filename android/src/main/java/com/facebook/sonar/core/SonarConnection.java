/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
package com.facebook.sonar.core;

/**
 * A connection between a SonarPlugin and the desktop Sonar application. Register request handlers
 * to respond to calls made by the desktop application or directly send messages to the desktop
 * application.
 */
public interface SonarConnection {

  /**
   * Call a remote method on the Sonar desktop application, passing an optional JSON object as a
   * parameter.
   */
  void send(String method, SonarObject params);

  /**
   * Call a remote method on the Sonar desktop application, passing an optional JSON array as a
   * parameter.
   */
  void send(String method, SonarArray params);

  /** Report client error */
  void reportError(Throwable throwable);

  /**
   * Register a receiver for a remote method call issued by the Sonar desktop application. The
   * SonarReceiver is passed a responder to respond back to the desktop application.
   */
  void receive(String method, SonarReceiver receiver);
}
