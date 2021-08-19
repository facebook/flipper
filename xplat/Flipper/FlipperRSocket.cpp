/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "FlipperRSocket.h"
#include <folly/String.h>
#include <folly/futures/Future.h>
#include <folly/io/async/AsyncSocketException.h>
#include <folly/io/async/SSLContext.h>
#include <folly/json.h>
#include <rsocket/Payload.h>
#include <rsocket/RSocket.h>
#include <rsocket/transports/tcp/TcpConnectionFactory.h>
#include <stdexcept>
#include <string>
#include <thread>
#include "ConnectionContextStore.h"
#include "FireAndForgetBasedFlipperResponder.h"
#include "FlipperRSocketResponder.h"
#include "FlipperResponderImpl.h"
#include "FlipperTransportTypes.h"
#include "Log.h"
#include "yarpl/Single.h"

static constexpr int connectionKeepaliveSeconds = 10;
static constexpr int maxPayloadSize = 0xFFFFFF;

namespace facebook {
namespace flipper {

rsocket::Payload toRSocketPayload(folly::dynamic data);

class RSocketEvents : public rsocket::RSocketConnectionEvents {
 private:
  const SocketEventHandler handler_;

 public:
  RSocketEvents(const SocketEventHandler eventHandler)
      : handler_(std::move(eventHandler)) {}

  void onConnected() {
    handler_(SocketEvent::OPEN);
  }

  void onDisconnected(const folly::exception_wrapper&) {
    handler_(SocketEvent::CLOSE);
  }

  void onClosed(const folly::exception_wrapper& e) {
    handler_(SocketEvent::CLOSE);
  }
};

class RSocketSerializer : public FlipperPayloadSerializer {
 public:
  void put(std::string key, std::string value) override {
    object_[key] = value;
  }
  void put(std::string key, int value) override {
    object_[key] = value;
  }
  std::string serialize() override {
    return folly::toJson(object_);
  }
  ~RSocketSerializer() {}

 private:
  folly::dynamic object_ = folly::dynamic::object();
};

rsocket::Payload toRSocketPayload(folly::dynamic data) {
  std::string json = folly::toJson(data);
  rsocket::Payload payload = rsocket::Payload(json);
  auto payloadLength = payload.data->computeChainDataLength();
  if (payloadLength > maxPayloadSize) {
    auto logMessage =
        std::string(
            "Error: Skipping sending message larger than max rsocket payload: ") +
        json.substr(0, 100) + "...";
    log(logMessage);
    throw std::length_error(logMessage);
  }

  return payload;
}

FlipperRSocket::FlipperRSocket(
    FlipperConnectionEndpoint endpoint,
    std::unique_ptr<FlipperSocketBasePayload> payload,
    folly::EventBase* eventBase)
    : endpoint_(std::move(endpoint)),
      payload_(std::move(payload)),
      eventBase_(eventBase) {}

FlipperRSocket::FlipperRSocket(
    FlipperConnectionEndpoint endpoint,
    std::unique_ptr<FlipperSocketBasePayload> payload,
    folly::EventBase* eventBase,
    ConnectionContextStore* connectionContextStore)
    : endpoint_(std::move(endpoint)),
      payload_(std::move(payload)),
      eventBase_(eventBase),
      connectionContextStore_(connectionContextStore) {}

void FlipperRSocket::setEventHandler(SocketEventHandler eventHandler) {
  eventHandler_ = std::move(eventHandler);
}

void FlipperRSocket::setMessageHandler(SocketMessageHandler messageHandler) {
  messageHandler_ = std::move(messageHandler);
}

bool FlipperRSocket::connect(FlipperConnectionManager* manager) {
  folly::SocketAddress address;
  address.setFromHostPort(endpoint_.host, endpoint_.port);

  auto serializer = RSocketSerializer{};
  payload_->serialize(serializer);
  auto payload = serializer.serialize();

  rsocket::SetupParameters parameters;
  parameters.payload = rsocket::Payload(payload);

  std::unique_ptr<rsocket::TcpConnectionFactory> tcpConnectionFactory = nullptr;
  if (endpoint_.secure) {
    tcpConnectionFactory = std::make_unique<rsocket::TcpConnectionFactory>(
        *eventBase_->getEventBase(),
        std::move(address),
        connectionContextStore_->getSSLContext());
  } else {
    tcpConnectionFactory = std::make_unique<rsocket::TcpConnectionFactory>(
        *eventBase_->getEventBase(), std::move(address));
  }

  auto newClient =
      rsocket::RSocket::createConnectedClient(
          std::move(tcpConnectionFactory),
          std::move(parameters),
          endpoint_.secure
              ? std::make_shared<FlipperRSocketResponder>(manager, eventBase_)
              : nullptr,
          std::chrono::seconds(connectionKeepaliveSeconds), // keepaliveInterval
          nullptr, // stats
          std::make_shared<RSocketEvents>(eventHandler_))
          .thenError<folly::AsyncSocketException>([](const auto& e) {
            if (e.getType() == folly::AsyncSocketException::NOT_OPEN ||
                e.getType() == folly::AsyncSocketException::NETWORK_ERROR) {
              // This is the state where no Flipper desktop client is connected.
              // We don't want an exception thrown here.
              return std::unique_ptr<rsocket::RSocketClient>(nullptr);
            }
            throw e;
          })
          .get();

  if (newClient.get() == nullptr) {
    return false;
  }

  client_ = std::move(newClient);
  return true;
}

void FlipperRSocket::disconnect() {
  if (client_.get() == nullptr)
    return;
  client_->disconnect();
}

void FlipperRSocket::send(
    const folly::dynamic& message,
    SocketSendHandler completion) {
  if (client_.get() == nullptr)
    return;
  rsocket::Payload payload = toRSocketPayload(message);
  client_->getRequester()
      ->fireAndForget(std::move(payload))
      ->subscribe(completion);
}

void FlipperRSocket::send(
    const std::string& message,
    SocketSendHandler completion) {
  if (client_.get() == nullptr)
    return;
  client_->getRequester()
      ->fireAndForget(rsocket::Payload(message))
      ->subscribe(completion);
}

void FlipperRSocket::sendExpectResponse(
    const std::string& message,
    SocketSendExpectResponseHandler completion) {
  if (client_.get() == nullptr)
    return;
  client_->getRequester()
      ->requestResponse(rsocket::Payload(message))
      ->subscribe(
          [completion](rsocket::Payload payload) {
            auto response = payload.moveDataToString();
            completion(response, false);
          },
          [completion](folly::exception_wrapper e) {
            e.handle(
                [&](rsocket::ErrorWithPayload& errorWithPayload) {
                  auto error = errorWithPayload.payload.moveDataToString();
                  completion(error, true);
                },
                [e, completion](...) { completion(e.what().c_str(), true); });
          });
}

} // namespace flipper
} // namespace facebook
