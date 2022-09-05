/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <folly/dynamic.h>
#include <winrt/Windows.Foundation.h>
#include <winrt/Windows.Networking.Sockets.h>
#include <future>
#include <memory>
#include <mutex>
#include "../../../../xplat/Flipper/FlipperSocket.h"
#include "../../../../xplat/Flipper/FlipperSocketProvider.h"
#include "../../../../xplat/Flipper/FlipperTransportTypes.h"
#include "FlipperReactBaseSocket.h"

namespace facebook {
namespace flipper {

class FlipperConnectionManager;
class ConnectionContextStore;
class FlipperReactSocketClient : public FlipperReactBaseSocket {
 public:
  FlipperReactSocketClient(
      FlipperConnectionEndpoint endpoint,
      std::unique_ptr<FlipperSocketBasePayload> payload,
      Scheduler* scheduler);
  FlipperReactSocketClient(
      FlipperConnectionEndpoint endpoint,
      std::unique_ptr<FlipperSocketBasePayload> payload,
      Scheduler* scheduler,
      ConnectionContextStore* connectionContextStore);

  FlipperReactSocketClient(const FlipperReactSocketClient&) = delete;
  FlipperReactSocketClient& operator=(const FlipperReactSocketClient&) = delete;

  virtual ~FlipperReactSocketClient();

  virtual bool connect(FlipperConnectionManager* manager) override;
  virtual void disconnect() override;

  virtual void send(const folly::dynamic& message, SocketSendHandler completion)
      override;
  virtual void send(const std::string& message, SocketSendHandler completion)
      override;
  virtual void sendExpectResponse(
      const std::string& message,
      SocketSendExpectResponseHandler completion) override;

  void OnWebSocketMessageReceived(
      winrt::Windows::Networking::Sockets::MessageWebSocket const& /* sender */,
      winrt::Windows::Networking::Sockets::
          MessageWebSocketMessageReceivedEventArgs const& args);
  void OnWebSocketClosed(
      winrt::Windows::Networking::Sockets::IWebSocket const& /* sender */,
      winrt::Windows::Networking::Sockets::WebSocketClosedEventArgs const&
          args);

 private:
  std::promise<bool> connected_;
  winrt::Windows::Networking::Sockets::MessageWebSocket socket_;
  winrt::event_token messageReceivedEventToken_;
  winrt::event_token closedEventToken_;

  winrt::Windows::Security::Cryptography::Certificates::Certificate
  findClientCertificateFromStore();
  winrt::Windows::Security::Cryptography::Certificates::Certificate
  installClientCertificate();
  winrt::Windows::Security::Cryptography::Certificates::Certificate
  getClientCertificate();

  std::unique_ptr<SocketSendExpectResponseHandler> overrideHandler_;
};

} // namespace flipper
} // namespace facebook
