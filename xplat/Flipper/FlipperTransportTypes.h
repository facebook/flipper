/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <string>

namespace facebook {
namespace flipper {

/**
  SocketEvent defines the socket states used by Flipper.
 */
enum class SocketEvent : int { OPEN, CLOSE, ERROR, SSL_ERROR };

/**
 Defines a socket event handler. Used to notify changes in socket state.
 Possible events are but not limited to: open, close, error.
 */
typedef std::function<void(SocketEvent)> SocketEventHandler;

/**
 Defines a socket message received handler.
 */
typedef std::function<void(const std::string& message)> SocketMessageHandler;

/**
 Defines a socket certificate provider. The provider is responsible of returning
 the necessary client certificate used to establish a valid secure connection.
 @param password Empty buffer which will be set by the provider with the
 certificate password.
 @param length Length of the password buffer.
 */
typedef std::function<std::string(char* password, size_t length)>
    SocketCertificateProvider;

/**
 Defines a socket send completion handler. This is used to notify the caller
 that data has been sent to the receiving end.
 */
typedef std::function<void()> SocketSendHandler;

/**
 Defines a socket send completion handler for the cases where a response is
 expected. This is used to notify the caller when a response has been received.
 @param response Received response.
 @param isError Indicates whether an error has taken place in which case the
 response will contain text describing the error.
 */
typedef std::function<void(std::string response, bool isError)>
    SocketSendExpectResponseHandler;

/**
 Defines a serializer than can be used to serialize socket payloads.
 */
struct FlipperPayloadSerializer {
  virtual ~FlipperPayloadSerializer() {}
  virtual void put(std::string key, std::string value) = 0;
  virtual void put(std::string key, int value) = 0;
  virtual std::string serialize() = 0;
};

/**
 Defines the base payload used to establish a connection in Flipper.
 */
struct FlipperSocketBasePayload {
  std::string os;
  std::string device;
  std::string device_id;
  std::string app;
  int sdk_version;
  int medium;
  FlipperSocketBasePayload() {}
  FlipperSocketBasePayload(
      std::string os,
      std::string device,
      std::string device_id,
      std::string app)
      : os(std::move(os)),
        device(std::move(device)),
        device_id(std::move(device_id)),
        app(std::move(app)) {}
  virtual ~FlipperSocketBasePayload() {}
  virtual void serialize(FlipperPayloadSerializer& serializer) {
    serializer.put("os", os);
    serializer.put("device", device);
    serializer.put("device_id", device_id);
    serializer.put("app", app);
    serializer.put("sdk_version", sdk_version);
    serializer.put("medium", medium);
  }
};

/**
  Defines the secure payload used to establish a secure connection in Flipper.
 */
struct FlipperSocketSecurePayload : public FlipperSocketBasePayload {
  std::string csr;
  std::string csr_path;
  FlipperSocketSecurePayload() {}
  FlipperSocketSecurePayload(
      std::string os,
      std::string device,
      std::string device_id,
      std::string app)
      : FlipperSocketBasePayload(os, device, device_id, app) {}
  virtual ~FlipperSocketSecurePayload() {}
  virtual void serialize(FlipperPayloadSerializer& serializer) {
    FlipperSocketBasePayload::serialize(serializer);
    serializer.put("csr", csr);
    serializer.put("csr_path", csr_path);
  }
};

/**
  Defines a connection endpoint used by Flipper.
 */
struct FlipperConnectionEndpoint {
  std::string host;
  int port;
  bool secure;

  FlipperConnectionEndpoint(std::string host, int port, bool secure)
      : host(std::move(host)), port(port), secure(secure) {}
};

} // namespace flipper
} // namespace facebook
