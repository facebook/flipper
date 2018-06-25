/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

#include <memory>

#ifdef SONAR_OSS
#include <fbjni/fbjni.h>
#else
#include <fb/fbjni.h>
#endif

#include <folly/json.h>
#include <folly/io/async/EventBase.h>
#include <folly/io/async/EventBaseManager.h>

#include <Sonar/SonarClient.h>
#include <Sonar/SonarWebSocket.h>
#include <Sonar/SonarConnection.h>
#include <Sonar/SonarResponder.h>

using namespace facebook;
using namespace facebook::sonar;

namespace {

class JEventBase : public jni::HybridClass<JEventBase> {
 public:
  constexpr static auto kJavaDescriptor = "Lcom/facebook/sonar/android/EventBase;";

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

class JSonarObject : public jni::JavaClass<JSonarObject> {
 public:
  constexpr static auto kJavaDescriptor = "Lcom/facebook/sonar/core/SonarObject;";

  static jni::local_ref<JSonarObject> create(const folly::dynamic& json) {
    return newInstance(folly::toJson(json));
  }

  std::string toJsonString() {
    static const auto method = javaClassStatic()->getMethod<std::string()>("toJsonString");
    return method(self())->toStdString();
  }
};

class JSonarArray : public jni::JavaClass<JSonarArray> {
 public:
  constexpr static auto kJavaDescriptor = "Lcom/facebook/sonar/core/SonarArray;";

  static jni::local_ref<JSonarArray> create(const folly::dynamic& json) {
    return newInstance(folly::toJson(json));
  }

  std::string toJsonString() {
    static const auto method = javaClassStatic()->getMethod<std::string()>("toJsonString");
    return method(self())->toStdString();
  }
};

class JSonarResponder : public jni::JavaClass<JSonarResponder> {
 public:
  constexpr static auto kJavaDescriptor = "Lcom/facebook/sonar/core/SonarResponder;";
};

class JSonarResponderImpl : public jni::HybridClass<JSonarResponderImpl, JSonarResponder> {
 public:
  constexpr static auto kJavaDescriptor = "Lcom/facebook/sonar/android/SonarResponderImpl;";

  static void registerNatives() {
    registerHybrid({
      makeNativeMethod("successObject", JSonarResponderImpl::successObject),
      makeNativeMethod("successArray", JSonarResponderImpl::successArray),
      makeNativeMethod("error", JSonarResponderImpl::error),
    });
  }

  void successObject(jni::alias_ref<JSonarObject> json) {
    _responder->success(json ? folly::parseJson(json->toJsonString()) : folly::dynamic::object());
  }

  void successArray(jni::alias_ref<JSonarArray> json) {
    _responder->success(json ? folly::parseJson(json->toJsonString()) : folly::dynamic::object());
  }

  void error(jni::alias_ref<JSonarObject> json) {
    _responder->error(json ? folly::parseJson(json->toJsonString()) : folly::dynamic::object());
  }

 private:
  friend HybridBase;
  std::shared_ptr<SonarResponder> _responder;

  JSonarResponderImpl(std::shared_ptr<SonarResponder> responder): _responder(std::move(responder)) {}
};

class JSonarReceiver : public jni::JavaClass<JSonarReceiver> {
 public:
  constexpr static auto kJavaDescriptor = "Lcom/facebook/sonar/core/SonarReceiver;";

  void receive(const folly::dynamic params, std::shared_ptr<SonarResponder> responder) const {
    static const auto method = javaClassStatic()->getMethod<void(jni::alias_ref<JSonarObject::javaobject>, jni::alias_ref<JSonarResponder::javaobject>)>("onReceive");
    method(self(), JSonarObject::create(std::move(params)), JSonarResponderImpl::newObjectCxxArgs(responder));
  }
};

class JSonarConnection : public jni::JavaClass<JSonarConnection> {
 public:
  constexpr static auto kJavaDescriptor = "Lcom/facebook/sonar/core/SonarConnection;";
};

class JSonarConnectionImpl : public jni::HybridClass<JSonarConnectionImpl, JSonarConnection> {
 public:
  constexpr static auto kJavaDescriptor = "Lcom/facebook/sonar/android/SonarConnectionImpl;";

  static void registerNatives() {
    registerHybrid({
      makeNativeMethod("sendObject", JSonarConnectionImpl::sendObject),
      makeNativeMethod("sendArray", JSonarConnectionImpl::sendArray),
      makeNativeMethod("reportError", JSonarConnectionImpl::reportError),
      makeNativeMethod("receive", JSonarConnectionImpl::receive),
    });
  }

  void sendObject(const std::string method, jni::alias_ref<JSonarObject> json) {
    _connection->send(std::move(method), json ? folly::parseJson(json->toJsonString()) : folly::dynamic::object());
  }

  void sendArray(const std::string method, jni::alias_ref<JSonarArray> json) {
    _connection->send(std::move(method), json ? folly::parseJson(json->toJsonString()) : folly::dynamic::object());
  }

  void reportError(jni::alias_ref<jni::JThrowable> throwable) {
    _connection->error(throwable->toString(), throwable->getStackTrace()->toString());
  }

  void receive(const std::string method, jni::alias_ref<JSonarReceiver> receiver) {
    auto global = make_global(receiver);
    _connection->receive(std::move(method), [global] (const folly::dynamic& params, std::unique_ptr<SonarResponder> responder) {
      global->receive(params, std::move(responder));
    });
  }

 private:
  friend HybridBase;
  std::shared_ptr<SonarConnection> _connection;

  JSonarConnectionImpl(std::shared_ptr<SonarConnection> connection): _connection(std::move(connection)) {}
};

class JSonarPlugin : public jni::JavaClass<JSonarPlugin> {
 public:
  constexpr static auto kJavaDescriptor = "Lcom/facebook/sonar/core/SonarPlugin;";

  std::string identifier() const {
    static const auto method = javaClassStatic()->getMethod<std::string()>("getId");
    return method(self())->toStdString();
  }

  void didConnect(std::shared_ptr<SonarConnection> conn) {
    static const auto method = javaClassStatic()->getMethod<void(jni::alias_ref<JSonarConnection::javaobject>)>("onConnect");
    method(self(), JSonarConnectionImpl::newObjectCxxArgs(conn));
  }

  void didDisconnect() {
    static const auto method = javaClassStatic()->getMethod<void()>("onDisconnect");
    method(self());
  }
};

class JSonarPluginWrapper : public SonarPlugin {
 public:
  jni::global_ref<JSonarPlugin> jplugin;

  virtual std::string identifier() const override {
    return jplugin->identifier();
  }

  virtual void didConnect(std::shared_ptr<SonarConnection> conn) override {
    jplugin->didConnect(conn);
  }

  virtual void didDisconnect() override {
    jplugin->didDisconnect();
  }

  JSonarPluginWrapper(jni::global_ref<JSonarPlugin> plugin): jplugin(plugin) {}
};

class JSonarClient : public jni::HybridClass<JSonarClient> {
 public:
  constexpr static auto kJavaDescriptor = "Lcom/facebook/sonar/android/SonarClientImpl;";

  static void registerNatives() {
    registerHybrid({
      makeNativeMethod("init", JSonarClient::init),
      makeNativeMethod("getInstance", JSonarClient::getInstance),
      makeNativeMethod("start", JSonarClient::start),
      makeNativeMethod("stop", JSonarClient::stop),
      makeNativeMethod("addPlugin", JSonarClient::addPlugin),
      makeNativeMethod("removePlugin", JSonarClient::removePlugin),
      makeNativeMethod("getPlugin", JSonarClient::getPlugin),
    });
  }

  static jni::alias_ref<JSonarClient::javaobject> getInstance(jni::alias_ref<jclass>) {
    static auto client = make_global(newObjectCxxArgs());
  	return client;
  }

  void start() {
  	SonarClient::instance()->start();
  }

  void stop() {
  	SonarClient::instance()->stop();
  }

  void addPlugin(jni::alias_ref<JSonarPlugin> plugin) {
    auto wrapper = std::make_shared<JSonarPluginWrapper>(make_global(plugin));
    SonarClient::instance()->addPlugin(wrapper);
  }

  void removePlugin(jni::alias_ref<JSonarPlugin> plugin) {
    auto client = SonarClient::instance();
    client->removePlugin(client->getPlugin(plugin->identifier()));
  }

  jni::alias_ref<JSonarPlugin> getPlugin(const std::string& identifier) {
    auto plugin = SonarClient::instance()->getPlugin(identifier);
    if (plugin) {
      auto wrapper = std::static_pointer_cast<JSonarPluginWrapper>(plugin);
      return wrapper->jplugin;
    } else {
      return nullptr;
    }
  }

  static void init(
      jni::alias_ref<jclass>,
      JEventBase* jEventBase,
      const std::string host,
      const std::string os,
      const std::string device,
      const std::string deviceId,
      const std::string app,
      const std::string appId,
      const std::string privateAppDirectory) {

    SonarClient::init({
      {
        std::move(host),
        std::move(os),
        std::move(device),
        std::move(deviceId),
        std::move(app),
        std::move(appId),
        std::move(privateAppDirectory)
      },
      jEventBase->eventBase(),
    });
  }

 private:
  friend HybridBase;

  JSonarClient() {}
};

} // namespace

jint JNI_OnLoad(JavaVM* vm, void*) {
  return jni::initialize(vm, [] {
    JSonarClient::registerNatives();
    JSonarConnectionImpl::registerNatives();
    JSonarResponderImpl::registerNatives();
    JEventBase::registerNatives();
  });
}
