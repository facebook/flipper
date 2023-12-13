/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <mutex>
#include <string>
#include <vector>
#include "FlipperLogLevel.h"

#define FLIPPER_LOGS_CAPACITY 512

namespace facebook {
namespace flipper {

template <typename T>
struct CircularContainer {
  explicit CircularContainer(size_t size) : size_(size), container_(size) {}

  void push_back(const T& value) {
    container_[head_] = value;
    head_ = (head_ + 1) % size_;
    count_ = std::min(count_ + 1, size_);
  }

  T& operator[](size_t index) {
    size_t count = std::min(count_, size_);
    return container_[(head_ + size_ - count + index) % size_];
  }

  std::vector<T> get() {
    std::vector<T> result;
    size_t count = std::min(count_, size_);
    size_t base = head_ + size_ - count;

    for (int i = 0; i < count; ++i) {
      auto idx = (base + i) % size_;
      result.push_back(container_[idx]);
    }

    head_ = 0;
    count_ = 0;

    return result;
  }

 private:
  size_t size_;
  size_t head_ = 0;
  size_t count_ = 0;
  std::vector<T> container_;
};

struct Logger {
  /** Returns a shared logger instance.
   */
  static Logger& shared();
  /** Logs a message.
   */
  void log(LogLevel level, const std::string& message);

  /** Returns all logs since last call to `getLogs`.
   * @returns A vector of strings containing all logs since last call.
   */
  std::vector<std::string> getLogs();

 private:
  std::mutex mutex_;
  CircularContainer<std::string> logs_ =
      CircularContainer<std::string>(FLIPPER_LOGS_CAPACITY);
};

} // namespace flipper
} // namespace facebook
