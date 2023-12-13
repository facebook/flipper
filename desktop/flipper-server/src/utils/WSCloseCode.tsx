/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

// Borrowed from https://github.com/strong-roots-capital/websocket-close-codes
export enum WSCloseCode {
  /**
   * Normal closure; the connection successfully completed whatever
   * purpose for which it was created.
   */
  NormalClosure = 1000,
  /**
   * The endpoint is going away, either because of a server failure
   * or because the browser is navigating away from the page that
   * opened the connection.
   */
  GoingAway = 1001,
  /**
   * The endpoint is terminating the connection due to a protocol
   * error.
   */
  ProtocolError = 1002,
  /**
   * The connection is being terminated because the endpoint
   * received data of a type it cannot accept (for example, a
   * text-only endpoint received binary data).
   */
  UnsupportedData = 1003,
  /**
   * (Reserved.)  Indicates that no status code was provided even
   * though one was expected.
   */
  NoStatusRecvd = 1005,
  /**
   * (Reserved.) Used to indicate that a connection was closed
   * abnormally (that is, with no close frame being sent) when a
   * status code is expected.
   */
  AbnormalClosure = 1006,
  /**
   * The endpoint is terminating the connection because a message
   * was received that contained inconsistent data (e.g., non-UTF-8
   * data within a text message).
   */
  InvalidFramePayloadData = 1007,
  /**
   * The endpoint is terminating the connection because it received
   * a message that violates its policy. This is a generic status
   * code, used when codes 1003 and 1009 are not suitable.
   */
  PolicyViolation = 1008,
  /**
   * The endpoint is terminating the connection because a data frame
   * was received that is too large.
   */
  MessageTooBig = 1009,
  /**
   * The client is terminating the connection because it expected
   * the server to negotiate one or more extension, but the server
   * didn't.
   */
  MissingExtension = 1010,
  /**
   * The server is terminating the connection because it encountered
   * an unexpected condition that prevented it from fulfilling the
   * request.
   */
  InternalError = 1011,
  /**
   * The server is terminating the connection because it is
   * restarting. [Ref]
   */
  ServiceRestart = 1012,
  /**
   * The server is terminating the connection due to a temporary
   * condition, e.g. it is overloaded and is casting off some of its
   * clients.
   */
  TryAgainLater = 1013,
  /**
   * The server was acting as a gateway or proxy and received an
   * invalid response from the upstream server. This is similar to
   * 502 HTTP Status Code.
   */
  BadGateway = 1014,
  /**
   * (Reserved.) Indicates that the connection was closed due to a
   * failure to perform a TLS handshake (e.g., the server
   * certificate can't be verified).
   */
  TLSHandshake = 1015,
}
