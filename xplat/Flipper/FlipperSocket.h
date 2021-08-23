/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <folly/dynamic.h>
#include <future>
#include <memory>
#include "FlipperTransportTypes.h"

namespace facebook {
namespace flipper {

class FlipperConnectionManager;
class ConnectionContextStore;
class FlipperSocket {
 public:
  virtual ~FlipperSocket() {}
  /**
    Sets the socket event handler. Used to observe underlying socket state
    changes.
    @param eventHandler Observer to be notified of state changes.
  */
  virtual void setEventHandler(SocketEventHandler eventHandler) {}
  /**
    Sets the socket message handler. Used to handle received messages.
    @discussion Message handler is only ever used for WebSocket connections.
    RSocket uses a different approach whereas a responder is used instead. We
    could create an RSocket responder that uses a message handler as well. For
    simplicity, and given that RSocket will be removed in future releases, it
    was decided not to follow that path.
    @param messageHandler Received messages handler.
  */
  virtual void setMessageHandler(SocketMessageHandler messageHandler) {}
  /**
    Connect the socket to the specified endpoint. This is a blocking call
    meaning that it will return once the socket is connected and ready to be
    used or error.
    @param manager An instance of FlipperConnectionManager.
  */
  virtual bool connect(FlipperConnectionManager* manager) = 0;
  /**
    Disconnect from the endpoint.
  */
  virtual void disconnect() = 0;
  /**
    Send a message to the receiving end.
    @param message A message to be sent.
    @param completion A completion handler to be invoked when the message has
    been sent.
  */
  virtual void send(
      const folly::dynamic& message,
      SocketSendHandler completion) = 0;
  /**
    Send a message to the receiving end.
    @param message A message to be sent.
    @param completion A completion handler to be invoked when the message has
    been sent.
  */
  virtual void send(
      const std::string& message,
      SocketSendHandler completion) = 0;
  /**
    Send a message and expect a response.
    @param message A message to be sent.
    @param completion A completion handler to be invoked when a response is
    received.
  */
  virtual void sendExpectResponse(
      const std::string& message,
      SocketSendExpectResponseHandler completion) = 0;
};

} // namespace flipper
} // namespace facebook
