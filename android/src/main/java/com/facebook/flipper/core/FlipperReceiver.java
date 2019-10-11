/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.core;

/**
 * A receiver of a remote method call issued by the Flipper desktop application. If the given
 * responder is present it means the Flipper desktop application is expecting a response.
 */
public interface FlipperReceiver {

  /**
   * Reciver for a request sent from the Flipper desktop client.
   *
   * @param params Optional set of parameters sent with the request.
   * @param responder Optional responder for request. Some requests don't warrant a response
   *     through. In this case the request should be made from the desktop using send() instead of
   *     call().
   */
  void onReceive(FlipperObject params, FlipperResponder responder) throws Exception;
}
