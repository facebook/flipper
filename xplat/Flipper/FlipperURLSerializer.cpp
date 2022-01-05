/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "FlipperURLSerializer.h"
#include <iomanip>
#include <sstream>
#include "FlipperBase64.h"

namespace facebook {
namespace flipper {

void URLSerializer::put(std::string key, std::string value) {
  object_[key] = value;
}
void URLSerializer::put(std::string key, int value) {
  object_[key] = value;
}

std::string URLSerializer::serialize() {
  std::string query = "";
  bool append = false;

  for (auto& pair : object_.items()) {
    auto key = pair.first.asString();
    auto value = pair.second.asString();
    if (append) {
      query += "&";
    }
    query += key;
    query += "=";
    if (key == "csr") {
      query += Base64::encode(value);
    } else {
      query +=
          folly::uriEscape<std::string>(value, folly::UriEscapeMode::QUERY);
    }
    append = true;
  }

  return query;
}

} // namespace flipper
} // namespace facebook
