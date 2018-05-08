/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

#include "SonarWebSocketImpl.h"
#include <easywsclient/easywsclient.hpp>
#include <folly/String.h>
#include <thread>

static constexpr int reconnectIntervalMs = 2000;

static void
urlAppendParam(std::string& url, std::string key, std::string value) {
  url.append(key);
  url.append("=");
  url.append(folly::uriEscape<std::string>(value));
  url.append("&");
}

namespace facebook {
namespace sonar {

using easywsclient::WebSocket;

SonarWebSocketImpl::SonarWebSocketImpl(SonarInitConfig config)
    : sendQueue_(
          config.workQueueFactory->createExecutor("SonarWebSocket.send")),
      receiveQueue_(
          config.workQueueFactory->createExecutor("SonarWebSocket.receive")),
      callbackQueue_(std::move(config.callbackQueue)) {
  url_ = ("ws://" + config.deviceData.host + ":8088/sonar?");
  urlAppendParam(url_, "host", config.deviceData.host);
  urlAppendParam(url_, "os", config.deviceData.os);
  urlAppendParam(url_, "device", config.deviceData.device);
  urlAppendParam(url_, "device_id", config.deviceData.deviceId);
  urlAppendParam(url_, "app", config.deviceData.app);
}

SonarWebSocketImpl::~SonarWebSocketImpl() {
  stop();
}

void SonarWebSocketImpl::start() {
  stopped_ = false;
  if (ws_) {
    return;
  }
  reconnect();
}

void SonarWebSocketImpl::reconnect() {
  receiveQueue_->add(std::bind(&SonarWebSocketImpl::reconnectAsync, this));
}

void SonarWebSocketImpl::reconnectAsync() {
#if defined(__APPLE__)
  pthread_setname_np("sonarwebsocketimpl-reconnectasync");
#endif

  while (!ws_) {
    std::lock_guard<std::mutex> lock(wsmutex_);
    if (stopped_) {
      break;
    }
    ws_.reset(WebSocket::from_url(url_));
    if (ws_) {
      callbackQueue_->add(
          std::bind(&SonarWebSocket::Callbacks::onConnected, callbacks_));
      receiveQueue_->add(std::bind(&SonarWebSocketImpl::pumpAsync, this));
    } else {
      std::this_thread::sleep_for(
          std::chrono::milliseconds(reconnectIntervalMs));
    }
  }
}

void SonarWebSocketImpl::pumpAsync() {
#if defined(__APPLE__)
  pthread_setname_np("sonarwebsocketimpl-pumpsync");
#endif

  while (true) {
    std::this_thread::sleep_for(std::chrono::milliseconds(20));
    std::lock_guard<std::mutex> lock(wsmutex_);
    if (ws_ && ws_->getReadyState() != WebSocket::CLOSED) {
      ws_->poll();
      ws_->dispatch([this](const std::string& message) {
        this->receiveMessage(message);
      });
    } else { // Connection closed (say, server was killed)
      ws_.reset(nullptr);
      callbackQueue_->add(
          std::bind(&SonarWebSocket::Callbacks::onDisconnected, callbacks_));
      reconnect();
      break;
    }
  }
}

void SonarWebSocketImpl::sendAsync(const std::string& message) {
  std::lock_guard<std::mutex> lock(wsmutex_);
  if (ws_ && ws_->getReadyState() == WebSocket::OPEN) {
    ws_->send(message);
    ws_->poll();
  }
}

void SonarWebSocketImpl::stop() {
  std::lock_guard<std::mutex> lock(wsmutex_);
  stopped_ = true;
  if (!ws_) {
    return;
  }
  ws_->close();
  ws_->poll();
  ws_.reset(nullptr);
  callbackQueue_->add(
      std::bind(&SonarWebSocket::Callbacks::onDisconnected, callbacks_));
}

bool SonarWebSocketImpl::isOpen() const {
  std::lock_guard<std::mutex> lock(wsmutex_);
  return ws_ && ws_->getReadyState() == WebSocket::OPEN;
}

void SonarWebSocketImpl::setCallbacks(Callbacks* callbacks) {
  callbacks_ = callbacks;
}

void SonarWebSocketImpl::sendMessage(const folly::dynamic& message) {
  const auto serial = folly::toJson(message);
  sendQueue_->add(std::bind(&SonarWebSocketImpl::sendAsync, this, serial));
}

void SonarWebSocketImpl::receiveMessage(const std::string& message) {
  const auto parsed = folly::parseJson(message);
  callbackQueue_->add(std::bind(
      &SonarWebSocket::Callbacks::onMessageReceived, callbacks_, parsed));
}

} // namespace sonar
} // namespace facebook
