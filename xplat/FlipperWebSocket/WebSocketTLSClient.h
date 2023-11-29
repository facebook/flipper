/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#pragma once

#include <Flipper/FlipperSocket.h>
#include <Flipper/FlipperSocketProvider.h>
#include <Flipper/FlipperTransportTypes.h>
#include <folly/dynamic.h>
#include <future>
#include <memory>
#include <mutex>
#include "BaseClient.h"

#include <websocketpp/client.hpp>
#include <websocketpp/config/asio_client.hpp>
#include <websocketpp/config/asio_no_tls_client.hpp>

namespace facebook {
namespace flipper {

typedef websocketpp::client<websocketpp::config::asio_tls_client>
    SocketTLSClient;
typedef websocketpp::lib::shared_ptr<websocketpp::lib::thread> SocketTLSThread;
typedef websocketpp::lib::shared_ptr<websocketpp::lib::asio::ssl::context>
    SocketTLSContext;

class FlipperConnectionManager;
class ConnectionContextStore;
class WebSocketTLSClient : public BaseClient {
 public:
  WebSocketTLSClient(
      FlipperConnectionEndpoint endpoint,
      std::unique_ptr<FlipperSocketBasePayload> payload,
      Scheduler* scheduler);
  WebSocketTLSClient(
      FlipperConnectionEndpoint endpoint,
      std::unique_ptr<FlipperSocketBasePayload> payload,
      Scheduler* scheduler,
      ConnectionContextStore* connectionContextStore);

  WebSocketTLSClient(const WebSocketTLSClient&) = delete;
  WebSocketTLSClient& operator=(const WebSocketTLSClient&) = delete;

  virtual ~WebSocketTLSClient();

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
  void onOpen(SocketTLSClient*, websocketpp::connection_hdl);
  void onMessage(
      SocketTLSClient*,
      websocketpp::connection_hdl,
      SocketTLSClient::message_ptr);
  void onFail(SocketTLSClient*, websocketpp::connection_hdl);
  void onClose(SocketTLSClient*, websocketpp::connection_hdl);
  SocketTLSContext onTLSInit(const char*, websocketpp::connection_hdl);

  SocketTLSClient socket_;
  SocketTLSClient::connection_ptr connection_;

  SocketTLSThread thread_;
  websocketpp::connection_hdl handle_;
};

} // namespace flipper
} // namespace facebook

#endif
