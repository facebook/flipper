/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifndef CertificateUtils_hpp
#define CertificateUtils_hpp

#include <openssl/pem.h>
#include <openssl/rsa.h>
#include <stdio.h>

namespace facebook {
namespace flipper {

bool generateCertSigningRequest(
    const char* appId,
    const char* csrFile,
    const char* privateKeyFile);

bool generateCertPKCS12(
    const char* caCertificateFile,
    const char* certificateFile,
    const char* keyFile,
    const char* pkcs12File,
    const char* pkcs12Name,
    const char* pkcs12Password);

} // namespace flipper
} // namespace facebook

#endif /* CertificateUtils_hpp */
