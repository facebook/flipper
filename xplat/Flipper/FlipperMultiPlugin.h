/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include "FlipperPlugin.h"

namespace facebook {
namespace flipper {
class FlipperMultiPlugin : public FlipperPlugin {
 public:
  explicit FlipperMultiPlugin(
      std::vector<std::shared_ptr<FlipperPlugin>> plugins);

  std::string identifier() const override;

  void addPlugin(std::shared_ptr<FlipperPlugin> plugin);

  void didConnect(std::shared_ptr<flipper::FlipperConnection> conn) override;

  void didDisconnect() override;

  bool runInBackground() override;

 private:
  std::vector<std::shared_ptr<FlipperPlugin>> plugins_;
};
} // namespace flipper
} // namespace facebook
