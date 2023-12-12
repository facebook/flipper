/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.core;

public interface FlipperSocketEventHandler {

  enum SocketEvent {
    OPEN(0),
    CLOSE(1),
    ERROR(2),
    SSL_ERROR(3);

    private final int mCode;

    private SocketEvent(int code) {
      this.mCode = code;
    }

    public int getCode() {
      return this.mCode;
    }
  }

  void onConnectionEvent(SocketEvent event, String message);

  void onMessageReceived(String message);

  FlipperObject onAuthenticationChallengeReceived();
}
