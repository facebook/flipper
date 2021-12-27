/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.core;

public interface FlipperSocket {

  /** Connect to the endpoint. */
  void flipperConnect();

  /** Disconnect from the endpoint. */
  void flipperDisconnect();

  /**
   * Call a remote method on the Flipper desktop application, passing an optional JSON array as a
   * parameter.
   */
  void flipperSend(String message);

  /** Sets a socket event handler. */
  void flipperSetEventHandler(FlipperSocketEventHandler eventHandler);
}
