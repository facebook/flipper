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

void log(const std::string& message);

using LogHandlerFunc = void (*)(const std::string& message);

void setLogHandler(LogHandlerFunc handler);
LogHandlerFunc getLogHandler();
void defaultLogHandler(const std::string& message);

} // namespace flipper
} // namespace facebook
