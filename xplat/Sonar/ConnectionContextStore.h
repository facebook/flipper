#pragma once

#include <string>
#include <folly/io/async/SSLContext.h>
#include <folly/dynamic.h>
#include "SonarInitConfig.h"

using namespace folly;

namespace facebook {
namespace flipper {

class ConnectionContextStore {

public:
  ConnectionContextStore(DeviceData deviceData);
  bool hasRequiredFiles();
  std::string createCertificateSigningRequest();
  std::shared_ptr<SSLContext> getSSLContext();
  std::string getCertificateDirectoryPath();
  std::string getDeviceId();
  void storeConnectionConfig(folly::dynamic& config);

private:
  DeviceData deviceData_;

  std::string absoluteFilePath(const char* filename);
  bool ensureSonarDirExists();

};

} // namespace sonar
} //namespace facebook
