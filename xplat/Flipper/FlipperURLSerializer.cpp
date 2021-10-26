/*
 * Copyright (c) Facebook, Inc. and its affiliates.
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
      query += url_encode(value);
    }
    append = true;
  }

  return query;
}

std::string URLSerializer::url_encode(const std::string& value) {
  std::ostringstream escaped;
  escaped.fill('0');
  escaped << std::hex;

  for (std::string::const_iterator i = value.begin(), n = value.end(); i != n;
       ++i) {
    std::string::value_type c = (*i);

    // Keep alphanumeric and other accepted characters intact
    if (std::isalnum(c) || c == '-' || c == '_' || c == '.' || c == '~') {
      escaped << c;
      continue;
    }

    // Any other characters are percent-encoded
    escaped << std::uppercase;
    escaped << '%' << std::setw(2) << int((unsigned char)c);
    escaped << std::nouppercase;
  }

  return escaped.str();
}

} // namespace flipper
} // namespace facebook
