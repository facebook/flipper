/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.core;

/**
 * A connection between a FlipperPlugin and the desktop Flipper application. Register request
 * handlers to respond to calls made by the desktop application or directly send messages to the
 * desktop application.
 */
public interface FlipperConnection {

  /**
   * Call a remote method on the Flipper desktop application, passing an optional JSON object as a
   * parameter.
   */
  void send(String method, FlipperObject params);

  /**
   * Call a remote method on the Flipper desktop application, passing an optional JSON array as a
   * parameter.
   */
  void send(String method, FlipperArray params);

  /** Report client error with reason and stacktrace as an argument */
  void reportErrorWithMetadata(String reason, String stackTrace);

  /** Report client error */
  void reportError(Throwable throwable);

  /**
   * Register a receiver for a remote method call issued by the Flipper desktop application. The
   * FlipperReceiver is passed a responder to respond back to the desktop application.
   */
  void receive(String method, FlipperReceiver receiver);
}
