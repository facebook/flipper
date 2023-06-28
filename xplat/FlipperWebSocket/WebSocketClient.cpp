/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#include "WebSocketClient.h"
#include <Flipper/ConnectionContextStore.h>
#include <Flipper/FlipperTransportTypes.h>
#include <Flipper/FlipperURLSerializer.h>
#include <Flipper/Log.h>
#include <folly/String.h>
#include <folly/futures/Future.h>
#include <folly/json.h>
#include <websocketpp/common/memory.hpp>
#include <websocketpp/common/thread.hpp>
#include <cctype>
#include <iomanip>
#include <sstream>
#include <stdexcept>
#include <string>
#include <thread>

namespace facebook {
namespace flipper {

WebSocketClient::WebSocketClient(
    FlipperConnectionEndpoint endpoint,
    std::unique_ptr<FlipperSocketBasePayload> payload,
    Scheduler* scheduler)
    : WebSocketClient(
          std::move(endpoint),
          std::move(payload),
          scheduler,
          nullptr) {}

WebSocketClient::WebSocketClient(
    FlipperConnectionEndpoint endpoint,
    std::unique_ptr<FlipperSocketBasePayload> payload,
    Scheduler* scheduler,
    ConnectionContextStore* connectionContextStore)
    : BaseClient(
          std::move(endpoint),
          std::move(payload),
          scheduler,
          connectionContextStore) {
  status_ = Status::Unconnected;

  socket_.clear_access_channels(websocketpp::log::alevel::all);
  socket_.clear_error_channels(websocketpp::log::elevel::all);
  socket_.init_asio();
  socket_.start_perpetual();

  thread_ = websocketpp::lib::make_shared<websocketpp::lib::thread>(
      &SocketClient::run, &socket_);
}

WebSocketClient::~WebSocketClient() {
  disconnect();
}

void WebSocketClient::connect(FlipperConnectionManager*) {
  if (status_ != Status::Unconnected) {
    return;
  }

  status_ = Status::Connecting;

  std::string connectionURL = endpoint_.secure ? "wss://" : "ws://";
  connectionURL += endpoint_.host;
  connectionURL += ":";
  connectionURL += std::to_string(endpoint_.port);

  auto serializer = URLSerializer{};
  payload_->serialize(serializer);
  auto payload = serializer.serialize();

  if (payload.size()) {
    connectionURL += "/?";
    connectionURL += payload;
  }

  auto uri = websocketpp::lib::make_shared<websocketpp::uri>(connectionURL);
  websocketpp::lib::error_code ec;
  connection_ = socket_.get_connection(uri, ec);

  if (ec) {
    status_ = Status::Failed;
    eventHandler_(SocketEvent::ERROR);
    return;
  }

  handle_ = connection_->get_handle();

  connection_->set_open_handler(websocketpp::lib::bind(
      &WebSocketClient::onOpen,
      this,
      &socket_,
      websocketpp::lib::placeholders::_1));

  connection_->set_message_handler(websocketpp::lib::bind(
      &WebSocketClient::onMessage,
      this,
      &socket_,
      websocketpp::lib::placeholders::_1,
      websocketpp::lib::placeholders::_2));

  connection_->set_fail_handler(websocketpp::lib::bind(
      &WebSocketClient::onFail,
      this,
      &socket_,
      websocketpp::lib::placeholders::_1));

  connection_->set_close_handler(websocketpp::lib::bind(
      &WebSocketClient::onClose,
      this,
      &socket_,
      websocketpp::lib::placeholders::_1));

  socket_.connect(connection_);
}

void WebSocketClient::disconnect() {
  socket_.stop_perpetual();

  if (status_ == Status::Connecting || status_ == Status::Open ||
      status_ == Status::Failed) {
    websocketpp::lib::error_code ec;
    socket_.close(handle_, websocketpp::close::status::going_away, "", ec);
  }
  socket_.stop();
  status_ = Status::Closed;
  if (thread_ && thread_->joinable()) {
    thread_->join();
  }
  thread_ = nullptr;
}

void WebSocketClient::send(
    const folly::dynamic& message,
    SocketSendHandler completion) {
  std::string json = folly::toJson(message);
  send(json, std::move(completion));
}

void WebSocketClient::send(
    const std::string& message,
    SocketSendHandler completion) {
  websocketpp::lib::error_code ec;
  socket_.send(
      handle_,
      &message[0],
      message.size(),
      websocketpp::frame::opcode::text,
      ec);
  completion();
}

/**
    Only ever used for insecure connections to receive the device_id from a
    signCertificate request. If the intended usage ever changes, then a better
    approach needs to be put in place.
 */
void WebSocketClient::sendExpectResponse(
    const std::string& message,
    SocketSendExpectResponseHandler completion) {
  connection_->set_message_handler([completion, scheduler = scheduler_](
                                       websocketpp::connection_hdl hdl,
                                       SocketClient::message_ptr msg) {
    const std::string& payload = msg->get_payload();
    scheduler->schedule([completion, payload] { completion(payload, false); });
  });
  websocketpp::lib::error_code ec;
  socket_.send(
      handle_,
      &message[0],
      message.size(),
      websocketpp::frame::opcode::text,
      ec);
  if (ec) {
    auto reason = ec.message();
    completion(reason, true);
  }
}

void WebSocketClient::onOpen(SocketClient* c, websocketpp::connection_hdl hdl) {
  if (status_ == Status::Connecting) {
    connected_.set_value(true);
  }

  status_ = Status::Initializing;
  eventHandler_(SocketEvent::OPEN);
}

void WebSocketClient::onMessage(
    SocketClient* c,
    websocketpp::connection_hdl hdl,
    SocketClient::message_ptr msg) {
  const std::string& payload = msg->get_payload();
  if (messageHandler_) {
    scheduler_->schedule([payload, messageHandler = messageHandler_]() {
      messageHandler(payload);
    });
  }
}

void WebSocketClient::onFail(SocketClient* c, websocketpp::connection_hdl hdl) {
  SocketClient::connection_ptr con = c->get_con_from_hdl(hdl);
  auto server = con->get_response_header("Server");
  auto reason = con->get_ec().message();

  if (status_ == Status::Connecting) {
    connected_.set_value(false);
  }
  status_ = Status::Failed;
  eventHandler_(SocketEvent::ERROR);
}

void WebSocketClient::onClose(
    SocketClient* c,
    websocketpp::connection_hdl hdl) {
  status_ = Status::Closed;
  eventHandler_(SocketEvent::CLOSE);
}

} // namespace flipper
} // namespace facebook

#endif
