/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "Log.h"
#include "FlipperLogger.h"

#ifdef __ANDROID__
#include <android/log.h>
#endif

// Uncomment to enable debug/verbose logging.
// #define FLIPPER_DEBUG_LOG 1

namespace facebook {
namespace flipper {

namespace {
static LogHandlerFunc* getHandle() {
  static LogHandlerFunc sHandler = defaultLogHandler;
  return &sHandler;
}
} // namespace

void log(const std::string& message) {
  Logger::shared().log(LogLevel::Info, message);
  return (*getHandle())(message);
}

void log_debug(LogLevel level, const std::string& message) {
  Logger::shared().log(level, message);
#ifdef FLIPPER_DEBUG_LOG
  return (*getHandle())(message);
#endif
}

void setLogHandler(LogHandlerFunc handler) {
  *getHandle() = handler;
}

LogHandlerFunc getLogHandler() {
  return *getHandle();
}

void defaultLogHandler(const std::string& message) {
#ifdef __ANDROID__
  __android_log_print(
      ANDROID_LOG_INFO, "flipper", "[flipper] %s", message.c_str());
#else
  printf("[flipper] %s\n", message.c_str());
#endif
}

} // namespace flipper
} // namespace facebook
