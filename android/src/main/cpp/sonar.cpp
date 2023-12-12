/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include <memory>

#ifdef FLIPPER_OSS
#include <fbjni/fbjni.h>
#else
#include <fb/fbjni.h>
#endif

#include <folly/futures/Future.h>
#include <folly/io/async/AsyncSocketException.h>
#include <folly/io/async/EventBase.h>
#include <folly/io/async/EventBaseManager.h>

#include <folly/json.h>

#include <Flipper/ConnectionContextStore.h>
#include <Flipper/FlipperClient.h>
#include <Flipper/FlipperConnection.h>
#include <Flipper/FlipperConnectionManager.h>
#include <Flipper/FlipperFollyScheduler.h>
#include <Flipper/FlipperLogger.h>
#include <Flipper/FlipperResponder.h>
#include <Flipper/FlipperSocket.h>
#include <Flipper/FlipperSocketProvider.h>
#include <Flipper/FlipperState.h>
#include <Flipper/FlipperStateUpdateListener.h>
#include <Flipper/FlipperTransportTypes.h>
#include <Flipper/FlipperURLSerializer.h>

using namespace facebook;
using namespace facebook::flipper;

namespace {

void handleException(const std::exception& e) {
  std::string message = "Exception caught in C++ and suppressed: ";
  message += e.what();
  __android_log_write(ANDROID_LOG_ERROR, "FLIPPER", message.c_str());
}

std::unique_ptr<facebook::flipper::Scheduler>& sonarScheduler() {
  static std::unique_ptr<facebook::flipper::Scheduler> scheduler;
  return scheduler;
}

std::unique_ptr<facebook::flipper::Scheduler>& connectionScheduler() {
  static std::unique_ptr<facebook::flipper::Scheduler> scheduler;
  return scheduler;
}

class JEventBase : public jni::HybridClass<JEventBase> {
 public:
  constexpr static auto kJavaDescriptor =
      "Lcom/facebook/flipper/android/EventBase;";

  static void registerNatives() {
    registerHybrid({
        makeNativeMethod("initHybrid", JEventBase::initHybrid),
        makeNativeMethod("loopForever", JEventBase::loopForever),
    });
  }

  folly::EventBase* eventBase() {
    return &eventBase_;
  }

 private:
  friend HybridBase;

  JEventBase() {}

  void loopForever() {
    folly::EventBaseManager::get()->setEventBase(&eventBase_, false);
    eventBase_.loopForever();
  }

  static void initHybrid(jni::alias_ref<jhybridobject> o) {
    return setCxxInstance(o);
  }

  folly::EventBase eventBase_;
};

class JFlipperObject : public jni::JavaClass<JFlipperObject> {
 public:
  constexpr static auto kJavaDescriptor =
      "Lcom/facebook/flipper/core/FlipperObject;";

  static jni::local_ref<JFlipperObject> create(const folly::dynamic& json) {
    return newInstance(folly::toJson(json));
  }

  std::string toJsonString() {
    static const auto method =
        javaClassStatic()->getMethod<std::string()>("toJsonString");
    return method(self())->toStdString();
  }
};

class JFlipperArray : public jni::JavaClass<JFlipperArray> {
 public:
  constexpr static auto kJavaDescriptor =
      "Lcom/facebook/flipper/core/FlipperArray;";

  static jni::local_ref<JFlipperArray> create(const folly::dynamic& json) {
    return newInstance(folly::toJson(json));
  }

  std::string toJsonString() {
    static const auto method =
        javaClassStatic()->getMethod<std::string()>("toJsonString");
    return method(self())->toStdString();
  }
};

class JFlipperSocketEventHandler
    : public jni::JavaClass<JFlipperSocketEventHandler> {
 public:
  constexpr static auto kJavaDescriptor =
      "Lcom/facebook/flipper/core/FlipperSocketEventHandler;";
};

class JFlipperWebSocket;
class JFlipperSocketEventHandlerImpl : public jni::HybridClass<
                                           JFlipperSocketEventHandlerImpl,
                                           JFlipperSocketEventHandler> {
 public:
  constexpr static auto kJavaDescriptor =
      "Lcom/facebook/flipper/android/FlipperSocketEventHandlerImpl;";

  static void registerNatives() {
    registerHybrid({
        makeNativeMethod(
            "reportConnectionEvent",
            JFlipperSocketEventHandlerImpl::reportConnectionEvent),
        makeNativeMethod(
            "reportMessageReceived",
            JFlipperSocketEventHandlerImpl::reportMessageReceived),
        makeNativeMethod(
            "reportAuthenticationChallengeReceived",
            JFlipperSocketEventHandlerImpl::
                reportAuthenticationChallengeReceived),
    });
  }

  void reportConnectionEvent(int code, const std::string& message) {
    // Only error events use the message parameter.
    if (message.length() > 0) {
      log_debug(LogLevel::Error, "Connection Event Error: " + message);
    }
    _eventHandler((SocketEvent)code);
  }

  void reportMessageReceived(const std::string& message) {
    _messageHandler(message);
  }

  jni::global_ref<JFlipperObject> reportAuthenticationChallengeReceived() {
    auto object = _certificateProvider();
    return make_global(object);
  }

 private:
  friend HybridBase;
  SocketEventHandler _eventHandler;
  SocketMessageHandler _messageHandler;
  using CustomProvider = std::function<jni::local_ref<JFlipperObject>()>;
  CustomProvider _certificateProvider;

  JFlipperSocketEventHandlerImpl(
      SocketEventHandler eventHandler,
      SocketMessageHandler messageHandler,
      CustomProvider certificateProvider)
      : _eventHandler(std::move(eventHandler)),
        _messageHandler(std::move(messageHandler)),
        _certificateProvider(std::move(certificateProvider)) {}
};

class JFlipperSocket : public jni::JavaClass<JFlipperSocket> {};

class JFlipperSocketImpl
    : public jni::JavaClass<JFlipperSocketImpl, JFlipperSocket> {
 public:
  constexpr static auto kJavaDescriptor =
      "Lcom/facebook/flipper/android/FlipperSocketImpl;";

  static jni::local_ref<JFlipperSocketImpl> create(const std::string& url) {
    return newInstance(url);
  }

  void connect() {
    static const auto method = getClass()->getMethod<void()>("flipperConnect");
    try {
      method(self());
    } catch (const std::exception& e) {
      handleException(e);
    } catch (const std::exception* e) {
      if (e) {
        handleException(*e);
      }
    }
  }

  void disconnect() {
    static const auto method =
        getClass()->getMethod<void()>("flipperDisconnect");
    try {
      method(self());
    } catch (const std::exception& e) {
      handleException(e);
    } catch (const std::exception* e) {
      if (e) {
        handleException(*e);
      }
    }
  }

  void send(const std::string& message) {
    static const auto method =
        getClass()->getMethod<void(std::string)>("flipperSend");
    try {
      method(self(), message);
    } catch (const std::exception& e) {
      handleException(e);
    } catch (const std::exception* e) {
      if (e) {
        handleException(*e);
      }
    }
  }

  void setEventHandler(
      jni::alias_ref<JFlipperSocketEventHandler> eventHandler) {
    static const auto method =
        getClass()->getMethod<void(jni::alias_ref<JFlipperSocketEventHandler>)>(
            "flipperSetEventHandler");
    try {
      method(self(), eventHandler);
    } catch (const std::exception& e) {
      handleException(e);
    } catch (const std::exception* e) {
      if (e) {
        handleException(*e);
      }
    }
  }
};

class JFlipperWebSocket : public facebook::flipper::FlipperSocket {
 public:
  JFlipperWebSocket(
      facebook::flipper::FlipperConnectionEndpoint endpoint,
      std::unique_ptr<facebook::flipper::FlipperSocketBasePayload> payload)
      : endpoint_(std::move(endpoint)), payload_(std::move(payload)) {}
  JFlipperWebSocket(
      facebook::flipper::FlipperConnectionEndpoint endpoint,
      std::unique_ptr<facebook::flipper::FlipperSocketBasePayload> payload,
      facebook::flipper::ConnectionContextStore* connectionContextStore)
      : endpoint_(std::move(endpoint)),
        payload_(std::move(payload)),
        connectionContextStore_(connectionContextStore) {}

  virtual ~JFlipperWebSocket() {
    if (socket_ != nullptr) {
      socket_->disconnect();
      socket_ = nullptr;
    }
  }

  virtual void setEventHandler(SocketEventHandler eventHandler) override {
    eventHandler_ = std::move(eventHandler);
  }
  virtual void setMessageHandler(SocketMessageHandler messageHandler) override {
    messageHandler_ = std::move(messageHandler);
  }

  virtual void connect(FlipperConnectionManager* manager) override {
    if (socket_ != nullptr) {
      return;
    }

    std::string connectionURL = endpoint_.secure ? "wss://" : "ws://";
    connectionURL += endpoint_.host;
    connectionURL += ":";
    connectionURL += std::to_string(endpoint_.port);

    auto serializer = facebook::flipper::URLSerializer{};
    payload_->serialize(serializer);
    auto payload = serializer.serialize();

    if (payload.size()) {
      connectionURL += "?";
      connectionURL += payload;
    }

    auto secure = endpoint_.secure;

    socket_ = make_global(JFlipperSocketImpl::create(connectionURL));
    socket_->setEventHandler(JFlipperSocketEventHandlerImpl::newObjectCxxArgs(
        [eventHandler = eventHandler_](SocketEvent event) {
          eventHandler(event);
        },
        [messageHandler = messageHandler_](const std::string& message) {
          messageHandler(message);
        },
        [secure, store = connectionContextStore_]() {
          folly::dynamic object_ = folly::dynamic::object();
          if (secure) {
            auto certificate = store->getCertificate();
            if (certificate.first.length() == 0) {
              return JFlipperObject::create(nullptr);
            }
            object_["certificates_client_path"] = certificate.first;
            object_["certificates_client_pass"] = certificate.second;
            object_["certificates_ca_path"] = store->getCACertificatePath();
          }
          return JFlipperObject::create(std::move(object_));
        }));
    socket_->connect();
  }

  virtual void disconnect() override {
    if (socket_ == nullptr) {
      return;
    }
    socket_->disconnect();
    socket_ = nullptr;
  }

  virtual void send(const folly::dynamic& message, SocketSendHandler completion)
      override {
    if (socket_ == nullptr) {
      return;
    }
    std::string json = folly::toJson(message);
    send(json, std::move(completion));
  }

  virtual void send(const std::string& message, SocketSendHandler completion)
      override {
    if (socket_ == nullptr) {
      return;
    }
    // Ensure the payload size is valid before sending.
    // The maximum allowed size for a message payload is 2^53 - 1. But that is
    // for the entire message, including any additional metadata.
    if (message.length() > pow(2, 53) - 1) {
      throw std::length_error("Payload is too big to send");
    }

    socket_->send(message);
    completion();
  }

  virtual void sendExpectResponse(
      const std::string& message,
      SocketSendExpectResponseHandler completion) override {
    if (socket_ == nullptr) {
      return;
    }

    socket_->setEventHandler(JFlipperSocketEventHandlerImpl::newObjectCxxArgs(
        [eventHandler = eventHandler_](SocketEvent event) {
          eventHandler(event);
        },
        [completion, message](const std::string& msg) {
          completion(msg, false);
        },
        []() {
          folly::dynamic object_ = folly::dynamic::object();
          return JFlipperObject::create(std::move(object_));
        }));

    socket_->send(message);
  }

 private:
  facebook::flipper::FlipperConnectionEndpoint endpoint_;
  std::unique_ptr<facebook::flipper::FlipperSocketBasePayload> payload_;
  facebook::flipper::ConnectionContextStore* connectionContextStore_;

  facebook::flipper::SocketEventHandler eventHandler_;
  facebook::flipper::SocketMessageHandler messageHandler_;

  jni::global_ref<JFlipperSocketImpl> socket_;
};

class JFlipperSocketProvider : public facebook::flipper::FlipperSocketProvider {
 public:
  JFlipperSocketProvider() {}
  virtual std::unique_ptr<facebook::flipper::FlipperSocket> create(
      facebook::flipper::FlipperConnectionEndpoint endpoint,
      std::unique_ptr<facebook::flipper::FlipperSocketBasePayload> payload,
      facebook::flipper::Scheduler* scheduler) override {
    return std::make_unique<JFlipperWebSocket>(
        std::move(endpoint), std::move(payload));
    ;
  }
  virtual std::unique_ptr<facebook::flipper::FlipperSocket> create(
      FlipperConnectionEndpoint endpoint,
      std::unique_ptr<FlipperSocketBasePayload> payload,
      facebook::flipper::Scheduler* scheduler,
      ConnectionContextStore* connectionContextStore) override {
    return std::make_unique<JFlipperWebSocket>(
        std::move(endpoint), std::move(payload), connectionContextStore);
  }
};

class JFlipperResponder : public jni::JavaClass<JFlipperResponder> {
 public:
  constexpr static auto kJavaDescriptor =
      "Lcom/facebook/flipper/core/FlipperResponder;";
};

class JFlipperResponderImpl
    : public jni::HybridClass<JFlipperResponderImpl, JFlipperResponder> {
 public:
  constexpr static auto kJavaDescriptor =
      "Lcom/facebook/flipper/android/FlipperResponderImpl;";

  static void registerNatives() {
    registerHybrid({
        makeNativeMethod("successObject", JFlipperResponderImpl::successObject),
        makeNativeMethod("successArray", JFlipperResponderImpl::successArray),
        makeNativeMethod("error", JFlipperResponderImpl::error),
    });
  }

  void successObject(jni::alias_ref<JFlipperObject> json) {
    _responder->success(
        json ? folly::parseJson(json->toJsonString())
             : folly::dynamic::object());
  }

  void successArray(jni::alias_ref<JFlipperArray> json) {
    _responder->success(
        json ? folly::parseJson(json->toJsonString())
             : folly::dynamic::object());
  }

  void error(jni::alias_ref<JFlipperObject> json) {
    _responder->error(
        json ? folly::parseJson(json->toJsonString())
             : folly::dynamic::object());
  }

 private:
  friend HybridBase;
  std::shared_ptr<FlipperResponder> _responder;

  JFlipperResponderImpl(std::shared_ptr<FlipperResponder> responder)
      : _responder(std::move(responder)) {}
};

class JFlipperReceiver : public jni::JavaClass<JFlipperReceiver> {
 public:
  constexpr static auto kJavaDescriptor =
      "Lcom/facebook/flipper/core/FlipperReceiver;";

  void receive(
      const folly::dynamic params,
      std::shared_ptr<FlipperResponder> responder) const {
    static const auto method =
        javaClassStatic()
            ->getMethod<void(
                jni::alias_ref<JFlipperObject::javaobject>,
                jni::alias_ref<JFlipperResponder::javaobject>)>("onReceive");
    method(
        self(),
        JFlipperObject::create(std::move(params)),
        JFlipperResponderImpl::newObjectCxxArgs(responder));
  }
};

class JFlipperConnection : public jni::JavaClass<JFlipperConnection> {
 public:
  constexpr static auto kJavaDescriptor =
      "Lcom/facebook/flipper/core/FlipperConnection;";
};

class JFlipperConnectionImpl
    : public jni::HybridClass<JFlipperConnectionImpl, JFlipperConnection> {
 public:
  constexpr static auto kJavaDescriptor =
      "Lcom/facebook/flipper/android/FlipperConnectionImpl;";

  static void registerNatives() {
    registerHybrid({
        makeNativeMethod("sendObject", JFlipperConnectionImpl::sendObject),
        makeNativeMethod("sendArray", JFlipperConnectionImpl::sendArray),
        makeNativeMethod("sendRaw", JFlipperConnectionImpl::sendRaw),
        makeNativeMethod("reportError", JFlipperConnectionImpl::reportError),
        makeNativeMethod(
            "reportErrorWithMetadata",
            JFlipperConnectionImpl::reportErrorWithMetadata),
        makeNativeMethod("receive", JFlipperConnectionImpl::receive),
    });
  }

  void sendRaw(const std::string method, const std::string params) {
    _connection->sendRaw(std::move(method), std::move(params));
  }

  void sendObject(
      const std::string method,
      jni::alias_ref<JFlipperObject> json) {
    _connection->send(
        std::move(method),
        json ? folly::parseJson(json->toJsonString())
             : folly::dynamic::object());
  }

  void sendArray(const std::string method, jni::alias_ref<JFlipperArray> json) {
    _connection->send(
        std::move(method),
        json ? folly::parseJson(json->toJsonString())
             : folly::dynamic::object());
  }

  void reportErrorWithMetadata(
      const std::string reason,
      const std::string stackTrace) {
    _connection->error(reason, stackTrace);
  }

  void reportError(jni::alias_ref<jni::JThrowable> throwable) {
    _connection->error(
        throwable->toString(), throwable->getStackTrace()->toString());
  }

  void receive(
      const std::string method,
      jni::alias_ref<JFlipperReceiver> receiver) {
    auto global = make_global(receiver);
    _connection->receive(
        std::move(method),
        [global](
            const folly::dynamic& params,
            std::shared_ptr<FlipperResponder> responder) {
          global->receive(params, responder);
        });
  }

 private:
  friend HybridBase;
  std::shared_ptr<FlipperConnection> _connection;

  JFlipperConnectionImpl(std::shared_ptr<FlipperConnection> connection)
      : _connection(std::move(connection)) {}
};

class JFlipperPlugin : public jni::JavaClass<JFlipperPlugin> {
 public:
  constexpr static auto kJavaDescriptor =
      "Lcom/facebook/flipper/core/FlipperPlugin;";

  std::string identifier() const {
    static const auto method =
        javaClassStatic()->getMethod<std::string()>("getId");
    try {
      return method(self())->toStdString();

    } catch (const std::exception& e) {
      handleException(e);
      return "";
    } catch (const std::exception* e) {
      if (e) {
        handleException(*e);
      }
      return "";
    }
  }

  void didConnect(std::shared_ptr<FlipperConnection> conn) {
    auto method =
        javaClassStatic()
            ->getMethod<void(jni::alias_ref<JFlipperConnection::javaobject>)>(
                "onConnect");
    try {
      method(self(), JFlipperConnectionImpl::newObjectCxxArgs(conn));
    } catch (const std::exception& e) {
      handleException(e);
    } catch (const std::exception* e) {
      if (e) {
        handleException(*e);
      }
    }
  }

  void didDisconnect() {
    static const auto method =
        javaClassStatic()->getMethod<void()>("onDisconnect");
    try {
      method(self());
    } catch (const std::exception& e) {
      handleException(e);
    } catch (const std::exception* e) {
      if (e) {
        handleException(*e);
      }
    }
  }

  bool runInBackground() {
    static const auto method =
        javaClassStatic()->getMethod<jboolean()>("runInBackground");
    try {
      return method(self()) == JNI_TRUE;
    } catch (const std::exception& e) {
      handleException(e);
      return false;
    } catch (const std::exception* e) {
      if (e) {
        handleException(*e);
      }
      return false;
    }
  }
};

class JFlipperStateUpdateListener
    : public jni::JavaClass<JFlipperStateUpdateListener> {
 public:
  constexpr static auto kJavaDescriptor =
      "Lcom/facebook/flipper/core/FlipperStateUpdateListener;";

  void onUpdate() {
    try {
      static const auto method =
          javaClassStatic()->getMethod<void()>("onUpdate");
      method(self());
    } catch (const std::exception& e) {
      handleException(e);
    } catch (const std::exception* e) {
      if (e) {
        handleException(*e);
      }
    }
  }
  void onStepStarted(std::string step) {
    try {
      static const auto method =
          javaClassStatic()->getMethod<void(std::string)>("onStepStarted");
      method(self(), step);
    } catch (const std::exception& e) {
      handleException(e);
    } catch (const std::exception* e) {
      if (e) {
        handleException(*e);
      }
    }
  }
  void onStepSuccess(std::string step) {
    try {
      static const auto method =
          javaClassStatic()->getMethod<void(std::string)>("onStepSuccess");
      method(self(), step);
    } catch (const std::exception& e) {
      handleException(e);
    } catch (const std::exception* e) {
      if (e) {
        handleException(*e);
      }
    }
  }
  void onStepFailed(std::string step, std::string errorMessage) {
    try {
      static const auto method =
          javaClassStatic()->getMethod<void(std::string, std::string)>(
              "onStepFailed");
      method(self(), step, errorMessage);
    } catch (const std::exception& e) {
      handleException(e);
    } catch (const std::exception* e) {
      if (e) {
        handleException(*e);
      }
    }
  }
};

class AndroidFlipperStateUpdateListener : public FlipperStateUpdateListener {
 public:
  AndroidFlipperStateUpdateListener(
      jni::alias_ref<JFlipperStateUpdateListener> stateListener);
  void onUpdate();

 private:
  jni::global_ref<JFlipperStateUpdateListener> jStateListener;
};

class JFlipperPluginWrapper : public FlipperPlugin {
 public:
  jni::global_ref<JFlipperPlugin> jplugin;

  virtual std::string identifier() const override {
    return jplugin->identifier();
  }

  virtual void didConnect(std::shared_ptr<FlipperConnection> conn) override {
    jplugin->didConnect(conn);
  }

  virtual void didDisconnect() override {
    jplugin->didDisconnect();
  }

  virtual bool runInBackground() override {
    return jplugin->runInBackground();
  }

  JFlipperPluginWrapper(jni::global_ref<JFlipperPlugin> plugin)
      : jplugin(plugin) {}
};

struct JStateSummary : public jni::JavaClass<JStateSummary> {
 public:
  constexpr static auto kJavaDescriptor =
      "Lcom/facebook/flipper/core/StateSummary;";

  static jni::local_ref<JStateSummary> create() {
    return newInstance();
  }

  void addEntry(std::string name, std::string state) {
    static const auto method =
        javaClassStatic()->getMethod<void(std::string, std::string)>(
            "addEntry");
    return method(self(), name, state);
  }
};

class JFlipperClient : public jni::HybridClass<JFlipperClient> {
 public:
  constexpr static auto kJavaDescriptor =
      "Lcom/facebook/flipper/android/FlipperClientImpl;";

  static void registerNatives() {
    registerHybrid({
        makeNativeMethod("init", JFlipperClient::init),
        makeNativeMethod("getInstance", JFlipperClient::getInstance),
        makeNativeMethod("start", JFlipperClient::start),
        makeNativeMethod("stop", JFlipperClient::stop),
        makeNativeMethod("isConnected", JFlipperClient::isConnected),
        makeNativeMethod("addPluginNative", JFlipperClient::addPlugin),
        makeNativeMethod("removePluginNative", JFlipperClient::removePlugin),
        makeNativeMethod(
            "subscribeForUpdates", JFlipperClient::subscribeForUpdates),
        makeNativeMethod("unsubscribe", JFlipperClient::unsubscribe),
        makeNativeMethod("getPlugin", JFlipperClient::getPlugin),
        makeNativeMethod("getState", JFlipperClient::getState),
        makeNativeMethod("getStateSummary", JFlipperClient::getStateSummary),
    });
  }

  static jni::alias_ref<JFlipperClient::javaobject> getInstance(
      jni::alias_ref<jclass>) {
    try {
      static auto client = make_global(newObjectCxxArgs());
      return client;
    } catch (const std::exception& e) {
      return nullptr;
    }
  }

  void start() {
    try {
      FlipperClient::instance()->start();
    } catch (const std::exception& e) {
      handleException(e);
    } catch (const std::exception* e) {
      if (e) {
        handleException(*e);
      }
    }
  }

  void stop() {
    try {
      FlipperClient::instance()->stop();
    } catch (const std::exception& e) {
      handleException(e);
    } catch (const std::exception* e) {
      if (e) {
        handleException(*e);
      }
    }
  }

  bool isConnected() {
    try {
      return FlipperClient::instance()->isConnected();
    } catch (const std::exception& e) {
      handleException(e);
    } catch (const std::exception* e) {
      if (e) {
        handleException(*e);
      }
    }
    return false;
  }

  void addPlugin(jni::alias_ref<JFlipperPlugin> plugin) {
    try {
      auto wrapper =
          std::make_shared<JFlipperPluginWrapper>(make_global(plugin));
      FlipperClient::instance()->addPlugin(wrapper);
    } catch (const std::exception& e) {
      handleException(e);
    } catch (const std::exception* e) {
      if (e) {
        handleException(*e);
      }
    }
  }

  void removePlugin(jni::alias_ref<JFlipperPlugin> plugin) {
    try {
      auto client = FlipperClient::instance();
      client->removePlugin(client->getPlugin(plugin->identifier()));
    } catch (const std::exception& e) {
      handleException(e);
    } catch (const std::exception* e) {
      if (e) {
        handleException(*e);
      }
    }
  }

  void subscribeForUpdates(
      jni::alias_ref<JFlipperStateUpdateListener> stateListener) {
    try {
      auto client = FlipperClient::instance();
      mStateListener =
          std::make_shared<AndroidFlipperStateUpdateListener>(stateListener);
      client->setStateListener(mStateListener);
    } catch (const std::exception& e) {
      handleException(e);
    } catch (const std::exception* e) {
      if (e) {
        handleException(*e);
      }
    }
  }

  void unsubscribe() {
    try {
      auto client = FlipperClient::instance();
      mStateListener = nullptr;
      client->setStateListener(nullptr);
    } catch (const std::exception& e) {
      handleException(e);
    } catch (const std::exception* e) {
      if (e) {
        handleException(*e);
      }
    }
  }

  std::string getState() {
    try {
      return FlipperClient::instance()->getState();
    } catch (const std::exception& e) {
      handleException(e);
      return "";
    } catch (const std::exception* e) {
      if (e) {
        handleException(*e);
      }
      return "";
    }
  }

  jni::global_ref<JStateSummary::javaobject> getStateSummary() {
    try {
      auto summary = jni::make_global(JStateSummary::create());
      auto elements = FlipperClient::instance()->getStateElements();
      for (auto&& element : elements) {
        std::string status;
        switch (element.state_) {
          case State::in_progress:
            status = "IN_PROGRESS";
            break;
          case State::failed:
            status = "FAILED";
            break;
          case State::success:
            status = "SUCCESS";
            break;
        }
        summary->addEntry(element.name_, status);
      }
      return summary;
    } catch (const std::exception& e) {
      handleException(e);
      return nullptr;
    } catch (const std::exception* e) {
      if (e) {
        handleException(*e);
      }
      return nullptr;
    }
  }

  jni::alias_ref<JFlipperPlugin> getPlugin(const std::string& identifier) {
    try {
      auto plugin = FlipperClient::instance()->getPlugin(identifier);
      if (plugin) {
        auto wrapper = std::static_pointer_cast<JFlipperPluginWrapper>(plugin);
        return wrapper->jplugin;
      } else {
        return nullptr;
      }
    } catch (const std::exception& e) {
      handleException(e);
      return nullptr;
    } catch (const std::exception* e) {
      if (e) {
        handleException(*e);
      }
      return nullptr;
    }
  }

  static void init(
      jni::alias_ref<jclass>,
      JEventBase* callbackWorker,
      JEventBase* connectionWorker,
      int insecurePort,
      int securePort,
      int altInsecurePort,
      int altSecurePort,
      const std::string host,
      const std::string os,
      const std::string device,
      const std::string deviceId,
      const std::string app,
      const std::string appId,
      const std::string privateAppDirectory) {
    sonarScheduler() =
        std::make_unique<FollyScheduler>(callbackWorker->eventBase());
    connectionScheduler() =
        std::make_unique<FollyScheduler>(connectionWorker->eventBase());

    FlipperClient::init(
        {{std::move(host),
          std::move(os),
          std::move(device),
          std::move(deviceId),
          std::move(app),
          std::move(appId),
          std::move(privateAppDirectory)},
         sonarScheduler().get(),
         connectionScheduler().get(),
         insecurePort,
         securePort,
         altInsecurePort,
         altSecurePort});
    facebook::flipper::FlipperSocketProvider::setDefaultProvider(
        std::make_unique<JFlipperSocketProvider>());
  }

 private:
  friend HybridBase;
  std::shared_ptr<FlipperStateUpdateListener> mStateListener = nullptr;
  JFlipperClient() {}
};

} // namespace

jint JNI_OnLoad(JavaVM* vm, void*) {
  return jni::initialize(vm, [] {
    JFlipperClient::registerNatives();
    JFlipperConnectionImpl::registerNatives();
    JFlipperResponderImpl::registerNatives();
    JEventBase::registerNatives();
    JFlipperSocketEventHandlerImpl::registerNatives();
  });
}

AndroidFlipperStateUpdateListener::AndroidFlipperStateUpdateListener(
    jni::alias_ref<JFlipperStateUpdateListener> stateListener) {
  jStateListener = jni::make_global(stateListener);
}

void AndroidFlipperStateUpdateListener::onUpdate() {
  jStateListener->onUpdate();
}
