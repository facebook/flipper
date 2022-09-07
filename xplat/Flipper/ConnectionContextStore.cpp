/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "ConnectionContextStore.h"
#include <folly/Optional.h>
#include <folly/json.h>
#include <folly/portability/SysStat.h>
#include <openssl/err.h>
#include <openssl/pem.h>
#include <openssl/pkcs12.h>
#include <openssl/x509.h>
#include <fstream>
#include <iostream>
#include <sstream>
#include <stdexcept>
#include <utility>
#include "CertificateUtils.h"
#include "Log.h"
namespace facebook {
namespace flipper {

static constexpr auto CSR_FILE_NAME = "app.csr";
static constexpr auto FLIPPER_CA_FILE_NAME = "sonarCA.crt";
static constexpr auto CLIENT_CERT_FILE_NAME = "device.crt";
static constexpr auto PRIVATE_KEY_FILE = "privateKey.pem";
static constexpr auto CERTIFICATE_FILE_NAME = "device.p12";
static constexpr auto CERTIFICATE_PASSWORD = "fl1pp3r";
static constexpr auto CONNECTION_CONFIG_FILE = "connection_config.json";

bool fileExists(std::string fileName);
std::string loadStringFromFile(std::string fileName);
void writeStringToFile(std::string content, std::string fileName);

ConnectionContextStore::ConnectionContextStore(DeviceData deviceData)
    : deviceData_(deviceData) {}

bool ConnectionContextStore::hasRequiredFiles() {
  std::string caCert =
      loadStringFromFile(absoluteFilePath(FLIPPER_CA_FILE_NAME));
  std::string clientCert =
      loadStringFromFile(absoluteFilePath(CLIENT_CERT_FILE_NAME));
  std::string privateKey =
      loadStringFromFile(absoluteFilePath(PRIVATE_KEY_FILE));
  std::string config =
      loadStringFromFile(absoluteFilePath(CONNECTION_CONFIG_FILE));

  if (caCert == "" || clientCert == "" || privateKey == "" || config == "") {
    return false;
  }
  return true;
}

std::string ConnectionContextStore::getCertificateSigningRequest() {
  // Use in-memory CSR if already loaded
  if (csr != "") {
    return csr;
  }

  // Attempt to load existing CSR from previous run of the app
  csr = loadStringFromFile(absoluteFilePath(CSR_FILE_NAME));
  if (csr != "") {
    return csr;
  }

  // Clean all state and generate a new one
  resetState();
  bool success = facebook::flipper::generateCertSigningRequest(
      deviceData_.appId.c_str(),
      absoluteFilePath(CSR_FILE_NAME).c_str(),
      absoluteFilePath(PRIVATE_KEY_FILE).c_str());
  if (!success) {
    throw new std::runtime_error("Failed to generate CSR");
  }
  csr = loadStringFromFile(absoluteFilePath(CSR_FILE_NAME));

  return csr;
}

std::string ConnectionContextStore::getDeviceId() {
  /* On android we can't reliably get the serial of the current device
     So rely on our locally written config, which is provided by the
     desktop app.
     For backwards compatibility, when this isn't present, fall back to the
     unreliable source. */
  try {
    std::string config =
        loadStringFromFile(absoluteFilePath(CONNECTION_CONFIG_FILE));
    auto maybeDeviceId = folly::parseJson(config)["deviceId"];
    return maybeDeviceId.isString() ? maybeDeviceId.getString()
                                    : deviceData_.deviceId;
  } catch (std::exception&) {
    return deviceData_.deviceId;
  }
}

folly::Optional<FlipperCertificateExchangeMedium>
ConnectionContextStore::getLastKnownMedium() {
  try {
    auto configurationFilePath = absoluteFilePath(CONNECTION_CONFIG_FILE);
    if (!fileExists(configurationFilePath)) {
      return folly::none;
    }
    std::string data = loadStringFromFile(configurationFilePath);
    auto config = folly::parseJson(data);
    if (config.count("medium") == 0) {
      return folly::none;
    }
    auto maybeMedium = config["medium"];
    return maybeMedium.isInt()
        ? folly::Optional<FlipperCertificateExchangeMedium>{static_cast<
              FlipperCertificateExchangeMedium>(maybeMedium.getInt())}
        : folly::none;
  } catch (std::exception&) {
    return folly::none;
  }
}

void ConnectionContextStore::storeConnectionConfig(folly::dynamic& config) {
  std::string json = folly::toJson(config);
  writeStringToFile(json, absoluteFilePath(CONNECTION_CONFIG_FILE));
}

std::string ConnectionContextStore::absoluteFilePath(const char* filename) {
#ifndef WIN32
  return std::string(deviceData_.privateAppDirectory + "/sonar/" + filename);
#else
  return std::string(deviceData_.privateAppDirectory + "\\sonar\\" + filename);
#endif
}

std::string ConnectionContextStore::getCertificateDirectoryPath() {
  return absoluteFilePath("");
}

std::string ConnectionContextStore::getCACertificatePath() {
  return absoluteFilePath(FLIPPER_CA_FILE_NAME);
}

std::string ConnectionContextStore::getPath(StoreItem storeItem) {
  switch (storeItem) {
    case CSR:
      return absoluteFilePath(CSR_FILE_NAME);
    case FLIPPER_CA:
      return absoluteFilePath(FLIPPER_CA_FILE_NAME);
    case CLIENT_CERT:
      return absoluteFilePath(CLIENT_CERT_FILE_NAME);
    case PRIVATE_KEY:
      return absoluteFilePath(PRIVATE_KEY_FILE);
    case CERTIFICATE:
      return absoluteFilePath(CERTIFICATE_FILE_NAME);
    case CONNECTION_CONFIG:
      return absoluteFilePath(CONNECTION_CONFIG_FILE);
  }
}

bool ConnectionContextStore::resetState() {
  // Clear in-memory state
  csr = "";

  // Delete state from disk
  std::string dirPath = absoluteFilePath("");
  struct stat info;
  if (stat(dirPath.c_str(), &info) != 0) {
    int ret = mkdir(dirPath.c_str(), S_IRUSR | S_IWUSR | S_IXUSR);
    return ret == 0;
  } else if (info.st_mode & S_IFDIR) {
    for (auto file :
         {CSR_FILE_NAME,
          FLIPPER_CA_FILE_NAME,
          CLIENT_CERT_FILE_NAME,
          PRIVATE_KEY_FILE,
          CONNECTION_CONFIG_FILE,
          CERTIFICATE_FILE_NAME}) {
      std::remove(absoluteFilePath(file).c_str());
    }
    return true;
  } else {
    log("ERROR: Flipper path exists but is not a directory: " + dirPath);
    return false;
  }
}

std::pair<std::string, std::string> ConnectionContextStore::getCertificate() {
  auto cacertFilepath = absoluteFilePath(FLIPPER_CA_FILE_NAME);
  auto certFilepath = absoluteFilePath(CLIENT_CERT_FILE_NAME);
  auto keyFilepath = absoluteFilePath(PRIVATE_KEY_FILE);
  auto certificate_path = absoluteFilePath(CERTIFICATE_FILE_NAME);

  if (fileExists(certificate_path.c_str())) {
    std::remove(certificate_path.c_str());
  }

  if (!facebook::flipper::generateCertPKCS12(
          cacertFilepath.c_str(),
          certFilepath.c_str(),
          keyFilepath.c_str(),
          certificate_path.c_str(),
          CERTIFICATE_FILE_NAME,
          CERTIFICATE_PASSWORD)) {
    log("ERROR: Unable to genereate certificate pkcs#12");
    return std::make_pair("", "");
  }

  return std::make_pair(certificate_path, std::string(CERTIFICATE_PASSWORD));
}

std::string loadStringFromFile(std::string fileName) {
  if (!fileExists(fileName)) {
    return "";
  }
  std::stringstream buffer;
  std::ifstream stream;
  std::string line;
  stream.open(fileName.c_str());
  if (!stream) {
    log("ERROR: Unable to open ifstream: " + fileName);
    return "";
  }
  buffer << stream.rdbuf();
  std::string s = buffer.str();
  return s;
}

void writeStringToFile(std::string content, std::string fileName) {
  std::ofstream out(fileName);
  out << content;
}

bool fileExists(std::string fileName) {
  struct stat buffer;
  return stat(fileName.c_str(), &buffer) == 0;
}

} // namespace flipper
} // namespace facebook
