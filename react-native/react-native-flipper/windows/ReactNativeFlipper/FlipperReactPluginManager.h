/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <FlipperReactPlugin.h>
#include <folly/dynamic.h>
#include <unordered_map>

namespace facebook {
namespace flipper {

class FlipperReactPluginManager {
  using FlipperReactPluginSubscriptionEvent =
      std::function<void(std::map<std::string, std::string>)>;

 public:
  bool registerPlugin(
      const std::string& pluginId,
      bool inBackground,
      FlipperConnectionEvent eventHandler);

  void send(
      const std::string& pluginId,
      const std::string& method,
      const std::string& params);

  void reportError(
      const std::string& pluginId,
      const std::string& reason,
      const std::string& stacktrace);

  void reportError(const std::string& pluginId, const std::string& error);
  void subscribe(
      const std::string& pluginId,
      const std::string& method,
      FlipperReactPluginSubscriptionEvent eventHandler);
  void respondSuccess(
      const std::string& responderId,
      const std::string& params);
  void respondError(const std::string& responderId, const std::string& params);

 private:
  static folly::dynamic getParams(const std::string& param);
  static void actionWithPlugin(
      const std::string& pluginId,
      std::function<void(FlipperReactPlugin*)> action);

  std::unordered_map<
      std::string,
      std::shared_ptr<facebook::flipper::FlipperResponder>>
      responders_;
};

} // namespace flipper
} // namespace facebook
