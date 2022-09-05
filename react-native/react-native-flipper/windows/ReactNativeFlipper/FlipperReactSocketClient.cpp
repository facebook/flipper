/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "FlipperReactSocketClient.h"

#include <folly/json.h>
#include <winrt/Windows.Foundation.Collections.h>
#include <winrt/Windows.Security.Cryptography.Certificates.h>
#include <winrt/Windows.Storage.Streams.h>
#include <cctype>
#include <iomanip>
#include <sstream>
#include <stdexcept>
#include <string>
#include <thread>
#include "../../../../xplat/Flipper/ConnectionContextStore.h"
#include "../../../../xplat/Flipper/FlipperTransportTypes.h"
#include "../../../../xplat/Flipper/FlipperURLSerializer.h"
#include "../../../../xplat/Flipper/Log.h"

using namespace winrt::Windows::Foundation;

namespace facebook {
namespace flipper {

static constexpr char* CERTIFICATE_FRIENDLY_NAME = "FlipperClientCertificate";

FlipperReactSocketClient::FlipperReactSocketClient(
    FlipperConnectionEndpoint endpoint,
    std::unique_ptr<FlipperSocketBasePayload> payload,
    Scheduler* scheduler)
    : FlipperReactSocketClient(
          std::move(endpoint),
          std::move(payload),
          scheduler,
          nullptr) {}

FlipperReactSocketClient::FlipperReactSocketClient(
    FlipperConnectionEndpoint endpoint,
    std::unique_ptr<FlipperSocketBasePayload> payload,
    Scheduler* scheduler,
    ConnectionContextStore* connectionContextStore)
    : FlipperReactBaseSocket(
          std::move(endpoint),
          std::move(payload),
          scheduler,
          connectionContextStore) {
  status_ = Status::Unconnected;
}

FlipperReactSocketClient::~FlipperReactSocketClient() {
  disconnect();
}

winrt::Windows::Security::Cryptography::Certificates::Certificate
FlipperReactSocketClient::findClientCertificateFromStore() {
  using namespace winrt::Windows::Foundation::Collections;
  using namespace winrt::Windows::Security::Cryptography::Certificates;

  CertificateQuery query;
  query.FriendlyName(winrt::to_hstring(CERTIFICATE_FRIENDLY_NAME));

  try {
    IVectorView<Certificate> certificates =
        CertificateStores::FindAllAsync(query).get();
    if (certificates.Size() > 0) {
      Certificate certificate = certificates.GetAt(0);
      return certificate;
    }
  } catch (winrt::hresult_error const& ex) {
    /* winrt::hresult_error can be thrown whilst trying to find certificates,
     * ignore. */
  }

  throw std::exception("Unable to find client certificate");
}

winrt::Windows::Security::Cryptography::Certificates::Certificate
FlipperReactSocketClient::installClientCertificate() {
  using namespace winrt::Windows::Foundation;
  using namespace winrt::Windows::Storage;
  using namespace winrt::Windows::Security::Cryptography;
  using namespace winrt::Windows::Security::Cryptography::Certificates;

  auto clientCertificateInfo = connectionContextStore_->getCertificate();
  if (clientCertificateInfo.first.empty() ||
      clientCertificateInfo.second.empty()) {
    throw std::exception("Unable to generate PKCS12");
  }

  try {
    StorageFile clientCertificateFile =
        StorageFile::GetFileFromPathAsync(
            winrt::to_hstring(clientCertificateInfo.first))
            .get();

    auto buffer = FileIO::ReadBufferAsync(clientCertificateFile).get();
    winrt::hstring clientCertificateData =
        CryptographicBuffer::EncodeToBase64String(buffer);
    auto password = winrt::to_hstring(clientCertificateInfo.second);

    Certificates::CertificateEnrollmentManager::ImportPfxDataAsync(
        clientCertificateData,
        password,
        ExportOption::Exportable,
        KeyProtectionLevel::NoConsent,
        InstallOptions::DeleteExpired,
        winrt::to_hstring(CERTIFICATE_FRIENDLY_NAME))
        .get();

    return findClientCertificateFromStore();
  } catch (winrt::hresult_error const& ex) {
    /* winrt::hresult_error can be thrown whilst trying to install the
     * certificate, ignore. */
  }

  throw std::exception("Unable to install client certificate");
}

winrt::Windows::Security::Cryptography::Certificates::Certificate
FlipperReactSocketClient::getClientCertificate() {
  using namespace winrt::Windows::Security::Cryptography::Certificates;
  try {
    return findClientCertificateFromStore();
  } catch (const std::exception& ex) {
    /* Client certificate may not be in the certificate store,
       if so, try to install it. Ignore exception. */
  }

  return installClientCertificate();
}

bool FlipperReactSocketClient::connect(FlipperConnectionManager* manager) {
  if (status_ != Status::Unconnected) {
    return false;
  }

  status_ = Status::Connecting;

  std::string connectionURL = endpoint_.secure ? "wss://" : "ws://";
  connectionURL += endpoint_.host.c_str();
  connectionURL += ":";
  connectionURL += std::to_string(endpoint_.port);

  auto serializer = URLSerializer{};
  payload_->serialize(serializer);
  auto payload = serializer.serialize();

  if (payload.size()) {
    connectionURL += "/?";
    connectionURL += payload;
  }

  auto uri = winrt::to_hstring(connectionURL);

  socket_.Control().MessageType(
      winrt::Windows::Networking::Sockets::SocketMessageType::Utf8);

  if (endpoint_.secure) {
    socket_.Control().ClientCertificate(getClientCertificate());
    socket_.Control().IgnorableServerCertificateErrors().Append(
        winrt::Windows::Security::Cryptography::Certificates::
            ChainValidationResult::Untrusted);
    socket_.Control().IgnorableServerCertificateErrors().Append(
        winrt::Windows::Security::Cryptography::Certificates::
            ChainValidationResult::InvalidName);
  }

  messageReceivedEventToken_ = socket_.MessageReceived(
      {this, &FlipperReactSocketClient::OnWebSocketMessageReceived});
  closedEventToken_ =
      socket_.Closed({this, &FlipperReactSocketClient::OnWebSocketClosed});

  try {
    this->socket_.ConnectAsync(winrt::Windows::Foundation::Uri(uri))
        .wait_for(std::chrono::seconds(10));

    status_ = Status::Initializing;
    scheduler_->schedule(
        [eventHandler = eventHandler_]() { eventHandler(SocketEvent::OPEN); });

    return true;
  } catch (winrt::hresult_error const& ex) {
    winrt::Windows::Web::WebErrorStatus webErrorStatus{
        winrt::Windows::Networking::Sockets::WebSocketError::GetStatus(
            ex.to_abi())};
  }

  disconnect();

  return false;
}

void FlipperReactSocketClient::disconnect() {
  status_ = Status::Closed;
  scheduler_->schedule(
      [eventHandler = eventHandler_]() { eventHandler(SocketEvent::CLOSE); });
  // socket_.Close();
  socket_ = nullptr;
}

void FlipperReactSocketClient::send(
    const folly::dynamic& message,
    SocketSendHandler completion) {
  std::string json = folly::toJson(message);
  send(json, std::move(completion));
}

void FlipperReactSocketClient::send(
    const std::string& message,
    SocketSendHandler completion) {
  using namespace winrt::Windows::Storage::Streams;
  auto payload = winrt::to_hstring(message);
  try {
    DataWriter dataWriter{socket_.OutputStream()};
    dataWriter.WriteString(payload);
    dataWriter.StoreAsync().get();
    dataWriter.DetachStream();

    completion();
  } catch (winrt::hresult_error const& ex) {
  } catch (const std::exception& ex) {
  }
}

/**
    Only ever used for insecure connections to receive the device_id from a
    signCertificate request. If the intended usage ever changes, then a better
    approach needs to be put in place.
 */
void FlipperReactSocketClient::sendExpectResponse(
    const std::string& message,
    SocketSendExpectResponseHandler completion) {
  using namespace winrt::Windows::Storage::Streams;

  overrideHandler_ =
      std::make_unique<SocketSendExpectResponseHandler>(completion);

  auto payload = winrt::to_hstring(message);
  try {
    DataWriter dataWriter{socket_.OutputStream()};
    dataWriter.WriteString(payload);
    dataWriter.StoreAsync().get();
    dataWriter.DetachStream();
  } catch (winrt::hresult_error const& ex) {
    overrideHandler_ = nullptr;
    completion("", true);
  } catch (const std::exception& ex) {
    overrideHandler_ = nullptr;
    completion(ex.what(), true);
  }
}

void FlipperReactSocketClient::OnWebSocketMessageReceived(
    winrt::Windows::Networking::Sockets::MessageWebSocket const& /* sender */,
    winrt::Windows::Networking::Sockets::
        MessageWebSocketMessageReceivedEventArgs const& args) {
  using namespace winrt::Windows::Storage::Streams;
  try {
    DataReader dataReader{args.GetDataReader()};
    dataReader.UnicodeEncoding(
        winrt::Windows::Storage::Streams::UnicodeEncoding::Utf8);
    auto message = dataReader.ReadString(dataReader.UnconsumedBufferLength());

    const std::string payload = winrt::to_string(message);

    if (overrideHandler_ != nullptr) {
      scheduler_->schedule([payload, messageHandler = *overrideHandler_]() {
        messageHandler(payload, false);
      });
      overrideHandler_ = nullptr;
    } else if (messageHandler_) {
      scheduler_->schedule([payload, messageHandler = messageHandler_]() {
        messageHandler(payload);
      });
    }
  } catch (winrt::hresult_error const& ex) {
    // winrt::Windows::Web::WebErrorStatus webErrorStatus{
    //    winrt::Windows::Networking::Sockets::WebSocketError::GetStatus(ex.to_abi())};
  }
}

void FlipperReactSocketClient::OnWebSocketClosed(
    winrt::Windows::Networking::Sockets::IWebSocket const& /* sender */,
    winrt::Windows::Networking::Sockets::WebSocketClosedEventArgs const& args) {
  if (status_ == Status::Closed) {
    return;
  }
  status_ = Status::Closed;
  scheduler_->schedule(
      [eventHandler = eventHandler_]() { eventHandler(SocketEvent::CLOSE); });
}

} // namespace flipper
} // namespace facebook
