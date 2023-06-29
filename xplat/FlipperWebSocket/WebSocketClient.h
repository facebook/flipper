/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#pragma once

#include <Flipper/FlipperScheduler.h>
#include <Flipper/FlipperSocket.h>
#include <Flipper/FlipperSocketProvider.h>
#include <Flipper/FlipperTransportTypes.h>
#include <folly/dynamic.h>
#include <future>
#include <memory>
#include <mutex>
#include "BaseClient.h"

#include <websocketpp/client.hpp>
#include <websocketpp/config/asio_no_tls_client.hpp>

namespace facebook {
namespace flipper {

typedef websocketpp::client<websocketpp::config::asio_client> SocketClient;
typedef websocketpp::lib::shared_ptr<websocketpp::lib::thread> SocketThread;

class FlipperConnectionManager;
class ConnectionContextStore;
class WebSocketClient : public BaseClient {
 public:
  WebSocketClient(
      FlipperConnectionEndpoint endpoint,
      std::unique_ptr<FlipperSocketBasePayload> payload,
      Scheduler* scheduler);
  WebSocketClient(
      FlipperConnectionEndpoint endpoint,
      std::unique_ptr<FlipperSocketBasePayload> payload,
      Scheduler* scheduler,
      ConnectionContextStore* connectionContextStore);

  WebSocketClient(const WebSocketClient&) = delete;
  WebSocketClient& operator=(const WebSocketClient&) = delete;

  virtual ~WebSocketClient();

  virtual void connect(FlipperConnectionManager* manager) override;
  virtual void disconnect() override;

  virtual void send(const folly::dynamic& message, SocketSendHandler completion)
      override;
  virtual void send(const std::string& message, SocketSendHandler completion)
      override;
  virtual void sendExpectResponse(
      const std::string& message,
      SocketSendExpectResponseHandler completion) override;

 private:
  void onOpen(SocketClient*, websocketpp::connection_hdl);
  void onMessage(
      SocketClient*,
      websocketpp::connection_hdl,
      SocketClient::message_ptr);
  void onFail(SocketClient*, websocketpp::connection_hdl);
  void onClose(SocketClient*, websocketpp::connection_hdl);

  SocketClient socket_;
  SocketClient::connection_ptr connection_;

  SocketThread thread_;
  websocketpp::connection_hdl handle_;
  std::promise<bool> connected_;
};

} // namespace flipper
} // namespace facebook

#endif
