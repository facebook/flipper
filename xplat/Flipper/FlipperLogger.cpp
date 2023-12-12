/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "FlipperLogger.h"

#include <chrono>
#include <string>
#include <unordered_map>

namespace facebook {
namespace flipper {

std::unordered_map<LogLevel, std::string> levelToString{
    {LogLevel::Info, "info"},
    {LogLevel::Warning, "warning"},
    {LogLevel::Error, "error"}};

/** Returns a shared logger instance.
 */
Logger& Logger::shared() {
  static Logger instance;
  return instance;
}
/** Logs a message.
 */
void Logger::log(LogLevel level, const std::string& message) {
  std::lock_guard<std::mutex> guard(mutex_);

  auto timeSinceEpoch = std::chrono::system_clock::now().time_since_epoch();
  auto ms =
      std::chrono::duration_cast<std::chrono::milliseconds>(timeSinceEpoch);

  std::string fullMessage =
      std::to_string(ms.count()) + ":" + levelToString[level] + ":" + message;

  logs_.push_back(fullMessage);
}

/** Returns all logs since last call to `getLogs`.
 * @returns A vector of strings containing all logs since last call.
 */
std::vector<std::string> Logger::getLogs() {
  std::lock_guard<std::mutex> guard(mutex_);

  return logs_.get();
}

} // namespace flipper
} // namespace facebook
