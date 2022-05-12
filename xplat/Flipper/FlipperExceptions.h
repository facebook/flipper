/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

namespace facebook {
namespace flipper {

class SSLException : public std::exception {
 public:
  explicit SSLException(const char* message) : msg_(message) {}

  explicit SSLException(const std::string& message) : msg_(message) {}

  virtual ~SSLException() noexcept {}

  virtual const char* what() const noexcept {
    return msg_.c_str();
  }

 protected:
  std::string msg_;
};

} // namespace flipper
} // namespace facebook
