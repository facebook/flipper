/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "FlipperBase64.h"
#include <openssl/bio.h>
#include <openssl/buffer.h>
#include <openssl/evp.h>

namespace facebook {
namespace flipper {

std::string Base64::encode(const std::string& input) {
  const auto base64_mem = BIO_new(BIO_s_mem());
  auto base64 = BIO_new(BIO_f_base64());
  base64 = BIO_push(base64, base64_mem);

  BIO_set_flags(base64, BIO_FLAGS_BASE64_NO_NL);

  BIO_write(base64, input.c_str(), static_cast<int>(input.length()));
  BIO_flush(base64);

  BUF_MEM* buffer_memory{};
  BIO_get_mem_ptr(base64, &buffer_memory);
  auto base64_encoded =
      std::string(buffer_memory->data, buffer_memory->length - 1);

  BIO_free_all(base64);

  return base64_encoded;
}

} // namespace flipper
} // namespace facebook
