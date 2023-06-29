/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#include "WebSocketTLSClient.h"
#include <Flipper/ConnectionContextStore.h>
#include <Flipper/FlipperExceptions.h>
#include <Flipper/FlipperTransportTypes.h>
#include <Flipper/FlipperURLSerializer.h>
#include <Flipper/Log.h>
#include <folly/String.h>
#include <folly/futures/Future.h>
#include <folly/io/async/SSLContext.h>
#include <folly/json.h>
#include <websocketpp/common/memory.hpp>
#include <websocketpp/common/thread.hpp>
#include <websocketpp/config/asio.hpp>
#include <cctype>
#include <iomanip>
#include <sstream>
#include <stdexcept>
#include <string>
#include <thread>

namespace facebook {
namespace flipper {

WebSocketTLSClient::WebSocketTLSClient(
    FlipperConnectionEndpoint endpoint,
    std::unique_ptr<FlipperSocketBasePayload> payload,
    Scheduler* scheduler)
    : WebSocketTLSClient(
          std::move(endpoint),
          std::move(payload),
          scheduler,
          nullptr) {}

WebSocketTLSClient::WebSocketTLSClient(
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
      &SocketTLSClient::run, &socket_);
}

WebSocketTLSClient::~WebSocketTLSClient() {
  disconnect();
}

void WebSocketTLSClient::connect(FlipperConnectionManager*) {
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

  socket_.set_tls_init_handler(bind(
      &WebSocketTLSClient::onTLSInit,
      this,
      endpoint_.host.c_str(),
      websocketpp::lib::placeholders::_1));

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
      &WebSocketTLSClient::onOpen,
      this,
      &socket_,
      websocketpp::lib::placeholders::_1));

  connection_->set_message_handler(websocketpp::lib::bind(
      &WebSocketTLSClient::onMessage,
      this,
      &socket_,
      websocketpp::lib::placeholders::_1,
      websocketpp::lib::placeholders::_2));

  connection_->set_fail_handler(websocketpp::lib::bind(
      &WebSocketTLSClient::onFail,
      this,
      &socket_,
      websocketpp::lib::placeholders::_1));

  connection_->set_close_handler(websocketpp::lib::bind(
      &WebSocketTLSClient::onClose,
      this,
      &socket_,
      websocketpp::lib::placeholders::_1));

  socket_.connect(connection_);
}

void WebSocketTLSClient::disconnect() {
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

void WebSocketTLSClient::send(
    const folly::dynamic& message,
    SocketSendHandler completion) {
  std::string json = folly::toJson(message);
  send(json, std::move(completion));
}

void WebSocketTLSClient::send(
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
void WebSocketTLSClient::sendExpectResponse(
    const std::string& message,
    SocketSendExpectResponseHandler completion) {
  connection_->set_message_handler([completion, scheduler = scheduler_](
                                       websocketpp::connection_hdl hdl,
                                       SocketTLSClient::message_ptr msg) {
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

void WebSocketTLSClient::onOpen(
    SocketTLSClient* c,
    websocketpp::connection_hdl hdl) {
  status_ = Status::Initializing;
  eventHandler_(SocketEvent::OPEN);
}

void WebSocketTLSClient::onMessage(
    SocketTLSClient* c,
    websocketpp::connection_hdl hdl,
    SocketTLSClient::message_ptr msg) {
  const std::string& payload = msg->get_payload();
  if (messageHandler_) {
    scheduler_->schedule([payload, messageHandler = messageHandler_]() {
      messageHandler(payload);
    });
  }
}

void WebSocketTLSClient::onFail(
    SocketTLSClient* c,
    websocketpp::connection_hdl hdl) {
  SocketTLSClient::connection_ptr con = c->get_con_from_hdl(hdl);
  auto server = con->get_response_header("Server");
  auto reason = con->get_ec().message();
  auto sslError =
      (reason.find("TLS handshake failed") != std::string::npos ||
       reason.find("Generic TLS related error") != std::string::npos);

  status_ = Status::Failed;
  if (sslError) {
    eventHandler_(SocketEvent::SSL_ERROR);
  } else {
    eventHandler_(SocketEvent::ERROR);
  }
}

void WebSocketTLSClient::onClose(
    SocketTLSClient* c,
    websocketpp::connection_hdl hdl) {
  status_ = Status::Closed;
  eventHandler_(SocketEvent::CLOSE);
}

SocketTLSContext WebSocketTLSClient::onTLSInit(
    const char* hostname,
    websocketpp::connection_hdl) {
  namespace asio = websocketpp::lib::asio;
  SocketTLSContext ctx = websocketpp::lib::make_shared<asio::ssl::context>(
      asio::ssl::context::sslv23);

  ctx->set_options(
      asio::ssl::context::default_workarounds | asio::ssl::context::no_sslv2 |
      asio::ssl::context::no_sslv3 | asio::ssl::context::single_dh_use);

  ctx->set_verify_mode(asio::ssl::verify_peer);
  ctx->load_verify_file(connectionContextStore_->getPath(
      ConnectionContextStore::StoreItem::FLIPPER_CA));

  asio::error_code error;
  ctx->use_certificate_file(
      connectionContextStore_->getPath(
          ConnectionContextStore::StoreItem::CLIENT_CERT),
      asio::ssl::context::pem,
      error);
  ctx->use_private_key_file(
      connectionContextStore_->getPath(
          ConnectionContextStore::StoreItem::PRIVATE_KEY),
      asio::ssl::context::pem,
      error);

  return ctx;
}

} // namespace flipper
} // namespace facebook

#endif
