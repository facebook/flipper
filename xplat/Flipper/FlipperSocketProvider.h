/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <memory>
#include "FlipperScheduler.h"

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
   @param scheduler An scheduler used to schedule and execute connection
   operations.
   */
  virtual std::unique_ptr<FlipperSocket> create(
      FlipperConnectionEndpoint endpoint,
      std::unique_ptr<FlipperSocketBasePayload> payload,
      Scheduler* scheduler) = 0;
  /**
   Create an instance of FlipperSocket.
   @param endpoint Endpoint to connect to.
   @param payload Any configuration payload to establish a connection with
   the specified endpoint.
   @param scheduler An scheduler used to schedule and execute connection
   operations.
   @param connectionContextStore A connection context store used for obtaining
   the certificate used for secure connections.
   */
  virtual std::unique_ptr<FlipperSocket> create(
      FlipperConnectionEndpoint endpoint,
      std::unique_ptr<FlipperSocketBasePayload> payload,
      Scheduler* scheduler,
      ConnectionContextStore* connectionContextStore) = 0;

  static std::unique_ptr<FlipperSocket> socketCreate(
      FlipperConnectionEndpoint endpoint,
      std::unique_ptr<FlipperSocketBasePayload> payload,
      Scheduler* scheduler);
  static std::unique_ptr<FlipperSocket> socketCreate(
      FlipperConnectionEndpoint endpoint,
      std::unique_ptr<FlipperSocketBasePayload> payload,
      Scheduler* scheduler,
      ConnectionContextStore* connectionContextStore);

  static void setDefaultProvider(
      std::unique_ptr<FlipperSocketProvider> provider);

  static bool hasProvider();

 private:
  static std::unique_ptr<FlipperSocketProvider>& defaultProvider();
};

} // namespace flipper
} // namespace facebook
