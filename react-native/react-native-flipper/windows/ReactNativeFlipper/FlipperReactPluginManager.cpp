/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "FlipperReactPluginManager.h"
#include <FlipperModule.h>
#include "../../../../xplat/Flipper/FlipperClient.h"

namespace facebook {
namespace flipper {

static int FlipperResponderKeyGenerator = 0;

folly::dynamic FlipperReactPluginManager::getParams(const std::string& params) {
  if (params.empty()) {
    return "";
  }

  return folly::parseJson(params);
}

void FlipperReactPluginManager::actionWithPlugin(
    const std::string& pluginId,
    std::function<void(FlipperReactPlugin*)> action) {
  auto flipperClient = facebook::flipper::FlipperClient::instance();
  if (flipperClient == nullptr) {
    return;
  }

  auto existingPlugin = flipperClient->getPlugin(pluginId);
  if (existingPlugin != nullptr) {
    FlipperReactPlugin* plugin =
        dynamic_cast<FlipperReactPlugin*>(existingPlugin.get());
    if (plugin) {
      action(plugin);
    }
  }
}

bool FlipperReactPluginManager::registerPlugin(
    const std::string& pluginId,
    bool inBackground,
    FlipperConnectionEvent eventHandler) {
  auto flipperClient = facebook::flipper::FlipperClient::instance();
  if (flipperClient == nullptr) {
    return false;
  }

  auto existingPlugin = flipperClient->getPlugin(pluginId);
  if (existingPlugin != nullptr) {
    FlipperReactPlugin* plugin =
        dynamic_cast<FlipperReactPlugin*>(existingPlugin.get());
    if (plugin && plugin->isConnected()) {
      plugin->fireOnConnect();
    }

    return true;
  }

  auto newPlugin = std::make_shared<FlipperReactPlugin>(
      pluginId, inBackground, eventHandler);
  flipperClient->addPlugin(newPlugin);
  return true;
}

void FlipperReactPluginManager::send(
    const std::string& pluginId,
    const std::string& method,
    const std::string& params) {
  actionWithPlugin(pluginId, [&method, &params](FlipperReactPlugin* plugin) {
    if (plugin->isConnected()) {
      plugin->getConnection()->send(method, getParams(params));
    }
  });
}

void FlipperReactPluginManager::reportError(
    const std::string& pluginId,
    const std::string& reason,
    const std::string& stacktrace) {
  actionWithPlugin(
      pluginId, [&reason, &stacktrace](FlipperReactPlugin* plugin) {
        if (plugin->isConnected()) {
          plugin->getConnection()->error(reason, stacktrace);
        }
      });
}

void FlipperReactPluginManager::reportError(
    const std::string& pluginId,
    const std::string& error) {
  actionWithPlugin(pluginId, [&error](FlipperReactPlugin* plugin) {
    if (plugin->isConnected()) {
      plugin->getConnection()->error(error, "");
    }
  });
}
void FlipperReactPluginManager::subscribe(
    const std::string& pluginId,
    const std::string& method,
    FlipperReactPluginSubscriptionEvent eventHandler) {
  actionWithPlugin(
      pluginId,
      [this, &pluginId, &method, &eventHandler](FlipperReactPlugin* plugin) {
        if (plugin->isConnected()) {
          plugin->getConnection()->receive(
              method,
              [this, pluginId, method, eventHandler](
                  const folly::dynamic& obj,
                  std::shared_ptr<facebook::flipper::FlipperResponder>
                      responder) {
                std::map<std::string, std::string> args{
                    {"plugin", pluginId},
                    {"method", method},
                    {"params", folly::toJson(obj)}};
                if (responder != nullptr) {
                  auto responderId =
                      std::to_string(FlipperResponderKeyGenerator++);
                  responders_[responderId] = responder;
                  args["responderId"] = responderId;
                }

                eventHandler(args);
              });
        }
      });
}
void FlipperReactPluginManager::respondSuccess(
    const std::string& responderId,
    const std::string& params) {
  auto responder = responders_.find(responderId);
  if (responder != responders_.end()) {
    responder->second->success(getParams(params));
    responders_.erase(responder);
  }
}
void FlipperReactPluginManager::respondError(
    const std::string& responderId,
    const std::string& params) {
  auto responder = responders_.find(responderId);
  if (responder != responders_.end()) {
    responder->second->error(getParams(params));
    responders_.erase(responder);
  }
}

} // namespace flipper
} // namespace facebook
