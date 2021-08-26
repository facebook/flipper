/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef FB_SONARKIT_ENABLED

#import "FlipperWebSocket.h"
#import <Flipper/ConnectionContextStore.h>
#import <Flipper/FlipperTransportTypes.h>
#import <Flipper/Log.h>
#import <folly/String.h>
#import <folly/futures/Future.h>
#import <folly/io/async/AsyncSocketException.h>
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

class WebSocketSerializer : public FlipperPayloadSerializer {
 public:
  void put(std::string key, std::string value) override {
    object_[key] = value;
  }
  void put(std::string key, int value) override {
    object_[key] = value;
  }
  std::string url_encode(const std::string& value) {
    std::ostringstream escaped;
    escaped.fill('0');
    escaped << std::hex;

    for (std::string::const_iterator i = value.begin(), n = value.end(); i != n;
         ++i) {
      std::string::value_type c = (*i);

      // Keep alphanumeric and other accepted characters intact
      if (std::isalnum(c) || c == '-' || c == '_' || c == '.' || c == '~') {
        escaped << c;
        continue;
      }

      // Any other characters are percent-encoded
      escaped << std::uppercase;
      escaped << '%' << std::setw(2) << int((unsigned char)c);
      escaped << std::nouppercase;
    }

    return escaped.str();
  }
  std::string serialize() override {
    std::string query = "";
    bool append = false;

    for (auto& pair : object_.items()) {
      auto key = pair.first.asString();
      auto value = pair.second.asString();
      if (append) {
        query += "&";
      }
      query += key;
      query += "=";
      if (key == "csr") {
        NSString* csr = [NSString stringWithUTF8String:value.c_str()];
        NSData* data = [csr dataUsingEncoding:NSUTF8StringEncoding];
        NSString* base64 = [data base64EncodedStringWithOptions:0];

        query += base64.UTF8String;
      } else {
        query += url_encode(value);
      }
      append = true;
    }

    return query;
  }
  ~WebSocketSerializer() {}

 private:
  folly::dynamic object_ = folly::dynamic::object();
};

FlipperWebSocket::FlipperWebSocket(
    FlipperConnectionEndpoint endpoint,
    std::unique_ptr<FlipperSocketBasePayload> payload,
    folly::EventBase* eventBase)
    : endpoint_(std::move(endpoint)),
      payload_(std::move(payload)),
      eventBase_(eventBase) {}

FlipperWebSocket::FlipperWebSocket(
    FlipperConnectionEndpoint endpoint,
    std::unique_ptr<FlipperSocketBasePayload> payload,
    folly::EventBase* eventBase,
    ConnectionContextStore* connectionContextStore)
    : endpoint_(std::move(endpoint)),
      payload_(std::move(payload)),
      eventBase_(eventBase),
      connectionContextStore_(connectionContextStore) {}

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

  auto serializer = WebSocketSerializer{};
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
      } else {
        promise.set_value(false);
      }
    }
    eventHandler(event);
  };
  socket_.messageHandler = ^(const std::string& message) {
    this->messageHandler_(message);
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

  eventBase_->runInEventBaseThread([this]() { [socket_ connect]; });

  auto state = connected.wait_for(std::chrono::seconds(10));
  if (state == std::future_status::ready) {
    return connected.get();
  }

  disconnect();
  return false;
}

void FlipperWebSocket::disconnect() {
  eventBase_->runInEventBaseThread([this]() {
    [socket_ disconnect];
    socket_ = NULL;
  });
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
  [socket_ send:messageObjc error:NULL];
  completion();
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
    [socket_ setMessageHandler:NULL];
  }];
  NSError* error = NULL;
  [socket_ send:messageObjc error:&error];

  if (error != NULL) {
    completion(error.description.UTF8String, true);
  }
}

} // namespace flipper
} // namespace facebook

#endif
