/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

#include "SonarClient.h"
#include "SonarConnectionImpl.h"
#include "SonarResponderImpl.h"
#include "SonarWebSocketImpl.h"

#ifdef __ANDROID__
#include <android/log.h>
#define SONAR_LOG(message) \
  __android_log_print(ANDROID_LOG_INFO, "sonar", "sonar: %s", message)
#else
#define SONAR_LOG(message) printf("sonar: %s\n", message)
#endif

#if FB_SONARKIT_ENABLED

namespace facebook {
namespace sonar {

static SonarClient* kInstance;

using folly::dynamic;

void SonarClient::init(SonarInitConfig config) {
  kInstance =
      new SonarClient(std::make_unique<SonarWebSocketImpl>(std::move(config)));
}

SonarClient* SonarClient::instance() {
  return kInstance;
}

void SonarClient::addPlugin(std::shared_ptr<SonarPlugin> plugin) {
  SONAR_LOG(("SonarClient::addPlugin " + plugin->identifier()).c_str());

  std::lock_guard<std::mutex> lock(mutex_);
  performAndReportError([this, plugin]() {
    if (plugins_.find(plugin->identifier()) != plugins_.end()) {
      throw std::out_of_range(
          "plugin " + plugin->identifier() + " already added.");
    }
    plugins_[plugin->identifier()] = plugin;
    if (connected_) {
      refreshPlugins();
    }
  });
}

void SonarClient::removePlugin(std::shared_ptr<SonarPlugin> plugin) {
  SONAR_LOG(("SonarClient::removePlugin " + plugin->identifier()).c_str());

  std::lock_guard<std::mutex> lock(mutex_);
  performAndReportError([this, plugin]() {
    if (plugins_.find(plugin->identifier()) == plugins_.end()) {
      throw std::out_of_range("plugin " + plugin->identifier() + " not added.");
    }
    disconnect(plugin);
    plugins_.erase(plugin->identifier());
    if (connected_) {
      refreshPlugins();
    }
  });
}

std::shared_ptr<SonarPlugin> SonarClient::getPlugin(
    const std::string& identifier) {
  std::lock_guard<std::mutex> lock(mutex_);
  if (plugins_.find(identifier) == plugins_.end()) {
    return nullptr;
  }
  return plugins_.at(identifier);
}

bool SonarClient::hasPlugin(const std::string& identifier) {
  std::lock_guard<std::mutex> lock(mutex_);
  return plugins_.find(identifier) != plugins_.end();
}

void SonarClient::disconnect(std::shared_ptr<SonarPlugin> plugin) {
  const auto& conn = connections_.find(plugin->identifier());
  if (conn != connections_.end()) {
    connections_.erase(plugin->identifier());
    plugin->didDisconnect();
  }
}

void SonarClient::refreshPlugins() {
  dynamic message = dynamic::object("method", "refreshPlugins");
  socket_->sendMessage(message);
}

void SonarClient::onConnected() {
  SONAR_LOG("SonarClient::onConnected");

  std::lock_guard<std::mutex> lock(mutex_);
  connected_ = true;
}

void SonarClient::onDisconnected() {
  SONAR_LOG("SonarClient::onDisconnected");

  std::lock_guard<std::mutex> lock(mutex_);
  connected_ = false;
  performAndReportError([this]() {
    for (const auto& iter : plugins_) {
      disconnect(iter.second);
    }
  });
}

void SonarClient::onMessageReceived(const dynamic& message) {
  std::lock_guard<std::mutex> lock(mutex_);
  performAndReportError([this, &message]() {
    const auto& method = message["method"];
    const auto& params = message.getDefault("params");

    std::unique_ptr<SonarResponderImpl> responder;
    if (message.find("id") != message.items().end()) {
      responder.reset(
          new SonarResponderImpl(socket_.get(), message["id"].getInt()));
    }

    if (method == "getPlugins") {
      dynamic identifiers = dynamic::array();
      for (const auto& elem : plugins_) {
        identifiers.push_back(elem.first);
      }
      dynamic response = dynamic::object("plugins", identifiers);
      responder->success(response);
      return;
    }

    if (method == "init") {
      const auto identifier = params["plugin"].getString();
      if (plugins_.find(identifier) == plugins_.end()) {
        throw std::out_of_range(
            "plugin " + identifier + " not found for method " +
            method.getString());
      }
      const auto plugin = plugins_.at(identifier);
      auto& conn = connections_[plugin->identifier()];
      conn = std::make_shared<SonarConnectionImpl>(
          socket_.get(), plugin->identifier());
      plugin->didConnect(conn);
      return;
    }

    if (method == "deinit") {
      const auto identifier = params["plugin"].getString();
      if (plugins_.find(identifier) == plugins_.end()) {
        throw std::out_of_range(
            "plugin " + identifier + " not found for method " +
            method.getString());
      }
      const auto plugin = plugins_.at(identifier);
      disconnect(plugin);
      return;
    }

    if (method == "execute") {
      const auto identifier = params["api"].getString();
      if (connections_.find(identifier) == connections_.end()) {
        throw std::out_of_range(
            "connection " + identifier + " not found for method " +
            method.getString());
      }
      const auto& conn = connections_.at(params["api"].getString());
      conn->call(
          params["method"].getString(),
          params.getDefault("params"),
          std::move(responder));
      return;
    }

    dynamic response =
        dynamic::object("message", "Received unknown method: " + method);
    responder->error(response);
  });
}

void SonarClient::performAndReportError(const std::function<void()>& func) {
  try {
    func();
  } catch (std::exception& e) {
    if (connected_) {
      dynamic message = dynamic::object(
          "error",
          dynamic::object("message", e.what())("stacktrace", "<none>"));
      socket_->sendMessage(message);
    }
  }
}

} // namespace sonar
} // namespace facebook

#endif
