/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

#pragma once

#include <folly/json.h>

namespace facebook {
namespace sonar {

class SonarWebSocket {
 public:
  class Callbacks;

 public:
  virtual ~SonarWebSocket(){};

  /**
   Establishes a connection to the ws server.
   */
  virtual void start() = 0;

  /**
   Closes an open connection to the ws server.
   */
  virtual void stop() = 0;

  /**
   True if there's an open connection.
   This method may block if the connection is busy.
   */
  virtual bool isOpen() const = 0;

  /**
   Send message to the ws server.
   */
  virtual void sendMessage(const folly::dynamic& message) = 0;

  /**
   Handler for connection and message receipt from the ws server.
   The callbacks should be set before a connection is established.
   */
  virtual void setCallbacks(Callbacks* callbacks) = 0;
};

class SonarWebSocket::Callbacks {
 public:
  virtual ~Callbacks(){};

  virtual void onConnected() = 0;

  virtual void onDisconnected() = 0;

  virtual void onMessageReceived(const folly::dynamic& message) = 0;
};

} // namespace sonar
} // namespace facebook
