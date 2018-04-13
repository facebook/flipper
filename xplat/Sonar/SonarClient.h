/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

#pragma once

#include <Sonar/SonarConnectionImpl.h>
#include <Sonar/SonarInitConfig.h>
#include <Sonar/SonarPlugin.h>
#include <Sonar/SonarWebSocket.h>
#include <map>
#include <mutex>

namespace facebook {
namespace sonar {

class SonarClient : public SonarWebSocket::Callbacks {
 public:
  /**
   Call before accessing instance with SonarClient::instance(). This will set up
   all the state needed to establish a Sonar connection.
   */
  static void init(SonarInitConfig config);

  /**
   Standard accessor for the shared SonarClient instance. This returns a
   singleton instance to a shared SonarClient. First call to this function will
   create the shared SonarClient. Must call SonarClient::initDeviceData() before
   first call to SonarClient::instance().
   */
  static SonarClient* instance();

  /**
   Only public for testing
   */
  SonarClient(std::unique_ptr<SonarWebSocket> socket)
      : socket_(std::move(socket)) {
    socket_->setCallbacks(this);
  }

  void start() {
    socket_->start();
  }

  void stop() {
    socket_->stop();
  }

  void onConnected() override;

  void onDisconnected() override;

  void onMessageReceived(const folly::dynamic& message) override;

  void addPlugin(std::shared_ptr<SonarPlugin> plugin);

  void removePlugin(std::shared_ptr<SonarPlugin> plugin);

  void refreshPlugins();

  std::shared_ptr<SonarPlugin> getPlugin(const std::string& identifier);

  template <typename P>
  std::shared_ptr<P> getPlugin(const std::string& identifier) {
    return std::static_pointer_cast<P>(getPlugin(identifier));
  }

  bool hasPlugin(const std::string& identifier);

 private:
  static SonarClient* instance_;
  bool connected_ = false;
  std::unique_ptr<SonarWebSocket> socket_;
  std::map<std::string, std::shared_ptr<SonarPlugin>> plugins_;
  std::map<std::string, std::shared_ptr<SonarConnectionImpl>> connections_;
  std::mutex mutex_;

  void performAndReportError(const std::function<void()>& func);
  void disconnect(std::shared_ptr<SonarPlugin> plugin);
};

} // namespace sonar
} // namespace facebook
