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
#include <Sonar/SonarState.h>
#include <Sonar/SonarWebSocket.h>
#include <map>
#include <mutex>
#include "SonarStep.h"
#include <vector>

namespace facebook {
namespace flipper {

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
  SonarClient(std::unique_ptr<SonarWebSocket> socket, std::shared_ptr<SonarState> state)
      : socket_(std::move(socket)), sonarState_(state) {
    auto step = sonarState_->start("Create client");
    socket_->setCallbacks(this);
    step->complete();
  }

  void start() {
    auto step = sonarState_->start("Start client");
    socket_->start();
    step->complete();
  }

  void stop() {
    auto step = sonarState_->start("Stop client");
    socket_->stop();
    step->complete();
  }

  void onConnected() override;

  void onDisconnected() override;

  void onMessageReceived(const folly::dynamic& message) override;

  void addPlugin(std::shared_ptr<SonarPlugin> plugin);

  void removePlugin(std::shared_ptr<SonarPlugin> plugin);

  void refreshPlugins();

  void setStateListener(
      std::shared_ptr<SonarStateUpdateListener> stateListener);

  std::shared_ptr<SonarPlugin> getPlugin(const std::string& identifier);

  std::string getState();

  std::vector<StateElement> getStateElements();

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
  std::shared_ptr<SonarState> sonarState_;

  void performAndReportError(const std::function<void()>& func);
  void disconnect(std::shared_ptr<SonarPlugin> plugin);
};

} // namespace flipper
} // namespace facebook
