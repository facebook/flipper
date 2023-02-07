/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "FlipperWebSocket.h"
#import <Flipper/ConnectionContextStore.h>
#import <Flipper/FlipperExceptions.h>
#import <Flipper/FlipperTransportTypes.h>
#import <Flipper/FlipperURLSerializer.h>
#import <Flipper/Log.h>
#import <folly/String.h>
#import <folly/futures/Future.h>
#import <folly/io/async/SSLContext.h>
#import <folly/json.h>
#import <cctype>
#import <iomanip>
#import <sstream>
#import <stdexcept>
#import <string>
#import <thread>
#import "FlipperPlatformWebSocket.h"

namespace facebook {
namespace flipper {

FlipperWebSocket::FlipperWebSocket(
    FlipperConnectionEndpoint endpoint,
    std::unique_ptr<FlipperSocketBasePayload> payload)
    : endpoint_(std::move(endpoint)), payload_(std::move(payload)) {}

FlipperWebSocket::FlipperWebSocket(
    FlipperConnectionEndpoint endpoint,
    std::unique_ptr<FlipperSocketBasePayload> payload,
    ConnectionContextStore* connectionContextStore)
    : endpoint_(std::move(endpoint)),
      payload_(std::move(payload)),
      connectionContextStore_(connectionContextStore) {}

FlipperWebSocket::~FlipperWebSocket() {
  disconnect();
}

void FlipperWebSocket::setEventHandler(SocketEventHandler eventHandler) {
  eventHandler_ = std::move(eventHandler);
}

void FlipperWebSocket::setMessageHandler(SocketMessageHandler messageHandler) {
  messageHandler_ = std::move(messageHandler);
}

bool FlipperWebSocket::connect(FlipperConnectionManager* manager) {
  if (socket_ != NULL) {
    return true;
  }

  std::string connectionURL = endpoint_.secure ? "wss://" : "ws://";
  connectionURL += endpoint_.host;
  connectionURL += ":";
  connectionURL += std::to_string(endpoint_.port);

  auto serializer = URLSerializer{};
  payload_->serialize(serializer);
  auto payload = serializer.serialize();

  if (payload.size()) {
    connectionURL += "?";
    connectionURL += payload;
  }

  __block bool fullfilled = false;
  __block std::promise<bool> promise;
  auto connected = promise.get_future();

  NSURL* urlObjc = [NSURL
      URLWithString:[NSString stringWithUTF8String:connectionURL.c_str()]];

  auto eventHandler = eventHandler_;
  socket_ = [[FlipperPlatformWebSocket alloc] initWithURL:urlObjc];
  socket_.eventHandler = ^(SocketEvent event) {
    /**
       Only fulfill the promise the first time the event handler is used. If the
       open event is received, then set the promise value to true. For any other
       event, consider a failure and set to false.
     */
    if (!fullfilled) {
      fullfilled = true;
      if (event == SocketEvent::OPEN) {
        promise.set_value(true);
      } else if (event == SocketEvent::SSL_ERROR) {
        try {
          promise.set_exception(
              std::make_exception_ptr(SSLException("SSL handshake failed")));
        } catch (...) {
          // set_exception() may throw an exception
          // In that case, just set the value to false.
          promise.set_value(false);
        }
      } else {
        promise.set_value(false);
      }
    }
    eventHandler(event);
  };
  auto messageHandler = messageHandler_;
  socket_.messageHandler = ^(const std::string& message) {
    messageHandler(message);
  };

  if (endpoint_.secure) {
    socket_.certificateProvider = [this](
                                      char* _Nonnull password, size_t length) {
      auto pkcs12 = connectionContextStore_->getCertificate();
      if (pkcs12.first.length() == 0) {
        return std::string("");
      }
      strncpy(password, pkcs12.second.c_str(), length);
      return pkcs12.first;
    };
  }

  [socket_ connect];

  return connected.get();
}

void FlipperWebSocket::disconnect() {
  [socket_ disconnect];
  socket_ = NULL;
}

void FlipperWebSocket::send(
    const folly::dynamic& message,
    SocketSendHandler completion) {
  if (socket_ == NULL) {
    return;
  }
  std::string json = folly::toJson(message);
  send(json, std::move(completion));
}

void FlipperWebSocket::send(
    const std::string& message,
    SocketSendHandler completion) {
  if (socket_ == NULL) {
    return;
  }
  NSString* messageObjc = [NSString stringWithUTF8String:message.c_str()];
  [socket_ send:messageObjc
      withCompletionHandler:^(NSError*) {
        completion();
      }];
}

/**
    Only ever used for insecure connections to receive the device_id from a
    signCertificate request. If the intended usage ever changes, then a better
    approach needs to be put in place.
 */
void FlipperWebSocket::sendExpectResponse(
    const std::string& message,
    SocketSendExpectResponseHandler completion) {
  if (socket_ == NULL) {
    return;
  }
  NSString* messageObjc = [NSString stringWithUTF8String:message.c_str()];

  [socket_ setMessageHandler:^(const std::string& msg) {
    completion(msg, false);
  }];

  [socket_ send:messageObjc
      withCompletionHandler:^(NSError* error) {
        if (error != NULL) {
          completion(error.description.UTF8String, true);
        }
      }];
}

} // namespace flipper
} // namespace facebook

#endif
