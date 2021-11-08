/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <folly/dynamic.h>
#include <folly/io/async/SSLContext.h>
#include <string>
#include "FlipperInitConfig.h"

namespace facebook {
namespace flipper {

class ConnectionContextStore {
 public:
  ConnectionContextStore(DeviceData deviceData);
  bool hasRequiredFiles();
  std::string getCertificateSigningRequest();
  std::shared_ptr<folly::SSLContext> getSSLContext();
  std::string getCertificateDirectoryPath();
  std::string getCACertificatePath();
  std::string getDeviceId();
  void storeConnectionConfig(folly::dynamic& config);
  bool resetState();

  /** Convert and save to disk the existing certificate to PKCS #12 format.
   * @return Returns a pair where `first` contains the certificate file path and
   * `second` contains the certificate export password. If there's an error, the
   * pair will contain both empty strings.
   */
  std::pair<std::string, std::string> getCertificate();

 private:
  DeviceData deviceData_;
  std::string csr = "";

  std::string absoluteFilePath(const char* filename);
};

} // namespace flipper
} // namespace facebook
