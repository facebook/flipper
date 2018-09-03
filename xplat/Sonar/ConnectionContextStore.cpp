#include "ConnectionContextStore.h"
#include "CertificateUtils.h"
#include <sys/stat.h>
#include <iostream>
#include <fstream>
#include <folly/json.h>

#ifdef __ANDROID__
#include <android/log.h>
#define SONAR_LOG(message) \
  __android_log_print(ANDROID_LOG_INFO, "sonar", "sonar: %s", message)
#else
#define SONAR_LOG(message) printf("sonar: %s\n", message)
#endif

using namespace facebook::sonar;

static constexpr auto CSR_FILE_NAME = "app.csr";
static constexpr auto SONAR_CA_FILE_NAME = "sonarCA.crt";
static constexpr auto CLIENT_CERT_FILE_NAME = "device.crt";
static constexpr auto PRIVATE_KEY_FILE = "privateKey.pem";
static constexpr auto CONNECTION_CONFIG_FILE = "connection_config.json";

bool fileExists(std::string fileName);
std::string loadStringFromFile(std::string fileName);
void writeStringToFile(std::string content, std::string fileName);

ConnectionContextStore::ConnectionContextStore(DeviceData deviceData): deviceData_(deviceData) {}

bool ConnectionContextStore::hasRequiredFiles() {
  std::string caCert = loadStringFromFile(absoluteFilePath(SONAR_CA_FILE_NAME));
  std::string clientCert =
      loadStringFromFile(absoluteFilePath(CLIENT_CERT_FILE_NAME));
  std::string privateKey =
      loadStringFromFile(absoluteFilePath(PRIVATE_KEY_FILE));

  if (caCert == "" || clientCert == "" || privateKey == "") {
    return false;
  }
  return true;
}

std::string ConnectionContextStore::createCertificateSigningRequest() {
  ensureSonarDirExists();
  generateCertSigningRequest(
      deviceData_.appId.c_str(),
      absoluteFilePath(CSR_FILE_NAME).c_str(),
      absoluteFilePath(PRIVATE_KEY_FILE).c_str());
      std::string csr = loadStringFromFile(absoluteFilePath(CSR_FILE_NAME));

  return csr;
}

std::shared_ptr<SSLContext> ConnectionContextStore::getSSLContext() {
  std::shared_ptr<folly::SSLContext> sslContext =
      std::make_shared<folly::SSLContext>();
  sslContext->loadTrustedCertificates(
      absoluteFilePath(SONAR_CA_FILE_NAME).c_str());
  sslContext->setVerificationOption(
      folly::SSLContext::SSLVerifyPeerEnum::VERIFY);
  sslContext->loadCertKeyPairFromFiles(
      absoluteFilePath(CLIENT_CERT_FILE_NAME).c_str(),
      absoluteFilePath(PRIVATE_KEY_FILE).c_str());
  sslContext->authenticate(true, false);
  return sslContext;
}

std::string ConnectionContextStore::getDeviceId() {
  /* On android we can't reliably get the serial of the current device
     So rely on our locally written config, which is provided by the
     desktop app.
     For backwards compatibility, when this isn't present, fall back to the
     unreliable source. */
  std::string config = loadStringFromFile(absoluteFilePath(CONNECTION_CONFIG_FILE));
  auto maybeDeviceId = folly::parseJson(config)["deviceId"];
  return maybeDeviceId.isString() ? maybeDeviceId.getString() : deviceData_.deviceId;
}

void ConnectionContextStore::storeConnectionConfig(folly::dynamic& config) {
  std::string json = folly::toJson(config);
  writeStringToFile(json, absoluteFilePath(CONNECTION_CONFIG_FILE));
}

std::string ConnectionContextStore::absoluteFilePath(const char* filename) {
  return std::string(deviceData_.privateAppDirectory + "/sonar/" + filename);
}

std::string ConnectionContextStore::getCertificateDirectoryPath() {
  return absoluteFilePath("");
}

bool ConnectionContextStore::ensureSonarDirExists() {
  std::string dirPath = absoluteFilePath("");
  struct stat info;
  if (stat(dirPath.c_str(), &info) != 0) {
    int ret = mkdir(dirPath.c_str(), S_IRUSR | S_IWUSR | S_IXUSR);
    return ret == 0;
  } else if (info.st_mode & S_IFDIR) {
    return true;
  } else {
    SONAR_LOG(std::string(
                  "ERROR: Sonar path exists but is not a directory: " + dirPath)
                  .c_str());
    return false;
  }
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
    SONAR_LOG(
        std::string("ERROR: Unable to open ifstream: " + fileName).c_str());
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
