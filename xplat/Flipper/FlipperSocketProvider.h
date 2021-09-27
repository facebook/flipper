/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <folly/io/async/EventBase.h>
#include <memory>

namespace facebook {
namespace flipper {

class FlipperSocket;
class FlipperConnectionManager;
class ConnectionContextStore;
struct FlipperConnectionEndpoint;
struct FlipperSocketBasePayload;

/**
    A socket provider is responsible of the creation of FlipperSocket instances.
 It also defines static factory methods that can be used to construct such
 instances.
 */
class FlipperSocketProvider {
 public:
  virtual ~FlipperSocketProvider() {}
  /**
   Create an instance of FlipperSocket.
   @param endpoint Endpoint to connect to.
   @param payload Any configuration payload to establish a connection with
   the specified endpoint.
   @param eventBase A folly event base used to execute connection operations.
   */
  virtual std::unique_ptr<FlipperSocket> create(
      FlipperConnectionEndpoint endpoint,
      std::unique_ptr<FlipperSocketBasePayload> payload,
      folly::EventBase* eventBase) = 0;
  /**
   Create an instance of FlipperSocket.
   @param endpoint Endpoint to connect to.
   @param payload Any configuration payload to establish a connection with
   the specified endpoint.
   @param eventBase A folly event base used to execute connection operations.
   @param connectionContextStore A connection context store used for obtaining
   the certificate used for secure connections.
   */
  virtual std::unique_ptr<FlipperSocket> create(
      FlipperConnectionEndpoint endpoint,
      std::unique_ptr<FlipperSocketBasePayload> payload,
      folly::EventBase* eventBase,
      ConnectionContextStore* connectionContextStore) = 0;

  static std::unique_ptr<FlipperSocket> socketCreate(
      FlipperConnectionEndpoint endpoint,
      std::unique_ptr<FlipperSocketBasePayload> payload,
      folly::EventBase* eventBase);
  static std::unique_ptr<FlipperSocket> socketCreate(
      FlipperConnectionEndpoint endpoint,
      std::unique_ptr<FlipperSocketBasePayload> payload,
      folly::EventBase* eventBase,
      ConnectionContextStore* connectionContextStore);

  static void setDefaultProvider(
      std::unique_ptr<FlipperSocketProvider> provider);

  /**
    Shelves the current default socket provider and promotes the internal
    socket provider as default.
   */
  static void shelveDefault();
  /**
    Restores a previously shelved socket provider.
   */
  static void unshelveDefault();

 private:
  static std::unique_ptr<FlipperSocketProvider> provider_;
  static std::unique_ptr<FlipperSocketProvider> shelvedProvider_;
};

} // namespace flipper
} // namespace facebook
