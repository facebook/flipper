/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

#pragma once

#include "FlipperConnectionImpl.h"
#include "FlipperInitConfig.h"
#include "FlipperPlugin.h"
#include "FlipperState.h"
#include "FlipperConnectionManager.h"
#include <map>
#include <mutex>
#include "FlipperStep.h"
#include <vector>

namespace facebook {
namespace flipper {

class FlipperClient : public FlipperConnectionManager::Callbacks {
 public:
  /**
   Call before accessing instance with FlipperClient::instance(). This will set up
   all the state needed to establish a Flipper connection.
   */
  static void init(FlipperInitConfig config);

  /**
   Standard accessor for the shared FlipperClient instance. This returns a
   singleton instance to a shared FlipperClient. First call to this function will
   create the shared FlipperClient. Must call FlipperClient::initDeviceData() before
   first call to FlipperClient::instance().
   */
  static FlipperClient* instance();

  /**
   Only public for testing
   */
  FlipperClient(std::unique_ptr<FlipperConnectionManager> socket, std::shared_ptr<FlipperState> state)
      : socket_(std::move(socket)), flipperState_(state) {
    auto step = flipperState_->start("Create client");
    socket_->setCallbacks(this);
    step->complete();
  }

  void start() {
    auto step = flipperState_->start("Start client");
    socket_->start();
    step->complete();
  }

  void stop() {
    auto step = flipperState_->start("Stop client");
    socket_->stop();
    step->complete();
  }

  void onConnected() override;

  void onDisconnected() override;

  void onMessageReceived(const folly::dynamic& message) override;

  void addPlugin(std::shared_ptr<FlipperPlugin> plugin);

  void removePlugin(std::shared_ptr<FlipperPlugin> plugin);

  void refreshPlugins();

  void setStateListener(
      std::shared_ptr<FlipperStateUpdateListener> stateListener);

  std::shared_ptr<FlipperPlugin> getPlugin(const std::string& identifier);

  std::string getState();

  std::vector<StateElement> getStateElements();

  template <typename P>
  std::shared_ptr<P> getPlugin(const std::string& identifier) {
    return std::static_pointer_cast<P>(getPlugin(identifier));
  }

  bool hasPlugin(const std::string& identifier);

 private:
  static FlipperClient* instance_;
  bool connected_ = false;
  std::unique_ptr<FlipperConnectionManager> socket_;
  std::map<std::string, std::shared_ptr<FlipperPlugin>> plugins_;
  std::map<std::string, std::shared_ptr<FlipperConnectionImpl>> connections_;
  std::mutex mutex_;
  std::shared_ptr<FlipperState> flipperState_;

  void performAndReportError(const std::function<void()>& func);
  void disconnect(std::shared_ptr<FlipperPlugin> plugin);
  void startBackgroundPlugins();
};

} // namespace flipper
} // namespace facebook
