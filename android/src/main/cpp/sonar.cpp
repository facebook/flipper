/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

#include <memory>

#ifdef FLIPPER_OSS
#include <fbjni/fbjni.h>
#else
#include <fb/fbjni.h>
#endif

#include <folly/json.h>
#include <folly/io/async/EventBase.h>
#include <folly/io/async/EventBaseManager.h>

#include <Flipper/FlipperClient.h>
#include <Flipper/FlipperConnectionManager.h>
#include <Flipper/FlipperConnection.h>
#include <Flipper/FlipperResponder.h>
#include <Flipper/FlipperStateUpdateListener.h>
#include <Flipper/FlipperState.h>

using namespace facebook;
using namespace facebook::flipper;

namespace {

class JEventBase : public jni::HybridClass<JEventBase> {
 public:
  constexpr static auto kJavaDescriptor = "Lcom/facebook/flipper/android/EventBase;";

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
  constexpr static auto kJavaDescriptor = "Lcom/facebook/flipper/core/FlipperObject;";

  static jni::local_ref<JFlipperObject> create(const folly::dynamic& json) {
    return newInstance(folly::toJson(json));
  }

  std::string toJsonString() {
    static const auto method = javaClassStatic()->getMethod<std::string()>("toJsonString");
    return method(self())->toStdString();
  }
};

class JFlipperArray : public jni::JavaClass<JFlipperArray> {
 public:
  constexpr static auto kJavaDescriptor = "Lcom/facebook/flipper/core/FlipperArray;";

  static jni::local_ref<JFlipperArray> create(const folly::dynamic& json) {
    return newInstance(folly::toJson(json));
  }

  std::string toJsonString() {
    static const auto method = javaClassStatic()->getMethod<std::string()>("toJsonString");
    return method(self())->toStdString();
  }
};

class JFlipperResponder : public jni::JavaClass<JFlipperResponder> {
 public:
  constexpr static auto kJavaDescriptor = "Lcom/facebook/flipper/core/FlipperResponder;";
};

class JFlipperResponderImpl : public jni::HybridClass<JFlipperResponderImpl, JFlipperResponder> {
 public:
  constexpr static auto kJavaDescriptor = "Lcom/facebook/flipper/android/FlipperResponderImpl;";

  static void registerNatives() {
    registerHybrid({
      makeNativeMethod("successObject", JFlipperResponderImpl::successObject),
      makeNativeMethod("successArray", JFlipperResponderImpl::successArray),
      makeNativeMethod("error", JFlipperResponderImpl::error),
    });
  }

  void successObject(jni::alias_ref<JFlipperObject> json) {
    _responder->success(json ? folly::parseJson(json->toJsonString()) : folly::dynamic::object());
  }

  void successArray(jni::alias_ref<JFlipperArray> json) {
    _responder->success(json ? folly::parseJson(json->toJsonString()) : folly::dynamic::object());
  }

  void error(jni::alias_ref<JFlipperObject> json) {
    _responder->error(json ? folly::parseJson(json->toJsonString()) : folly::dynamic::object());
  }

 private:
  friend HybridBase;
  std::shared_ptr<FlipperResponder> _responder;

  JFlipperResponderImpl(std::shared_ptr<FlipperResponder> responder): _responder(std::move(responder)) {}
};

class JFlipperReceiver : public jni::JavaClass<JFlipperReceiver> {
 public:
  constexpr static auto kJavaDescriptor = "Lcom/facebook/flipper/core/FlipperReceiver;";

  void receive(const folly::dynamic params, std::shared_ptr<FlipperResponder> responder) const {
    static const auto method = javaClassStatic()->getMethod<void(jni::alias_ref<JFlipperObject::javaobject>, jni::alias_ref<JFlipperResponder::javaobject>)>("onReceive");
    method(self(), JFlipperObject::create(std::move(params)), JFlipperResponderImpl::newObjectCxxArgs(responder));
  }
};

class JFlipperConnection : public jni::JavaClass<JFlipperConnection> {
 public:
  constexpr static auto kJavaDescriptor = "Lcom/facebook/flipper/core/FlipperConnection;";
};

class JFlipperConnectionImpl : public jni::HybridClass<JFlipperConnectionImpl, JFlipperConnection> {
 public:
  constexpr static auto kJavaDescriptor = "Lcom/facebook/flipper/android/FlipperConnectionImpl;";

  static void registerNatives() {
    registerHybrid({
      makeNativeMethod("sendObject", JFlipperConnectionImpl::sendObject),
      makeNativeMethod("sendArray", JFlipperConnectionImpl::sendArray),
      makeNativeMethod("reportError", JFlipperConnectionImpl::reportError),
      makeNativeMethod("receive", JFlipperConnectionImpl::receive),
    });
  }

  void sendObject(const std::string method, jni::alias_ref<JFlipperObject> json) {
    _connection->send(std::move(method), json ? folly::parseJson(json->toJsonString()) : folly::dynamic::object());
  }

  void sendArray(const std::string method, jni::alias_ref<JFlipperArray> json) {
    _connection->send(std::move(method), json ? folly::parseJson(json->toJsonString()) : folly::dynamic::object());
  }

  void reportError(jni::alias_ref<jni::JThrowable> throwable) {
    _connection->error(throwable->toString(), throwable->getStackTrace()->toString());
  }

  void receive(const std::string method, jni::alias_ref<JFlipperReceiver> receiver) {
    auto global = make_global(receiver);
    _connection->receive(std::move(method), [global] (const folly::dynamic& params, std::unique_ptr<FlipperResponder> responder) {
      global->receive(params, std::move(responder));
    });
  }

 private:
  friend HybridBase;
  std::shared_ptr<FlipperConnection> _connection;

  JFlipperConnectionImpl(std::shared_ptr<FlipperConnection> connection): _connection(std::move(connection)) {}
};

class JFlipperPlugin : public jni::JavaClass<JFlipperPlugin> {
 public:
  constexpr static auto kJavaDescriptor = "Lcom/facebook/flipper/core/FlipperPlugin;";

  std::string identifier() const {
    static const auto method = javaClassStatic()->getMethod<std::string()>("getId");
    return method(self())->toStdString();
  }

  void didConnect(std::shared_ptr<FlipperConnection> conn) {
    static const auto method = javaClassStatic()->getMethod<void(jni::alias_ref<JFlipperConnection::javaobject>)>("onConnect");
    method(self(), JFlipperConnectionImpl::newObjectCxxArgs(conn));
  }

  void didDisconnect() {
    static const auto method = javaClassStatic()->getMethod<void()>("onDisconnect");
    method(self());
  }

    bool runInBackground() {
        static const auto method = javaClassStatic()->getMethod<jboolean()>("runInBackground");
        return method(self()) == JNI_TRUE;
    }
};

class JFlipperStateUpdateListener : public jni::JavaClass<JFlipperStateUpdateListener> {
 public:
  constexpr static auto  kJavaDescriptor = "Lcom/facebook/flipper/core/FlipperStateUpdateListener;";

  void onUpdate() {
    static const auto method = javaClassStatic()->getMethod<void()>("onUpdate");
    method(self());
  }
  void onStepStarted(std::string step) {
    static const auto method = javaClassStatic()->getMethod<void(std::string)>("onStepStarted");
    method(self(), step);
  }
  void onStepSuccess(std::string step) {
    static const auto method = javaClassStatic()->getMethod<void(std::string)>("onStepSuccess");
    method(self(), step);
  }
  void onStepFailed(std::string step, std::string errorMessage) {
    static const auto method = javaClassStatic()->getMethod<void(std::string, std::string)>("onStepFailed");
    method(self(), step, errorMessage);
  }
};

class AndroidFlipperStateUpdateListener : public FlipperStateUpdateListener {
 public:
  AndroidFlipperStateUpdateListener(jni::alias_ref<JFlipperStateUpdateListener> stateListener);
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

  JFlipperPluginWrapper(jni::global_ref<JFlipperPlugin> plugin): jplugin(plugin) {}
};

struct JStateSummary : public jni::JavaClass<JStateSummary> {
public:
  constexpr static auto kJavaDescriptor = "Lcom/facebook/flipper/core/StateSummary;";

  static jni::local_ref<JStateSummary> create() {
    return newInstance();
  }

  void addEntry(std::string name, std::string state) {
    static const auto method = javaClassStatic()->getMethod<void(std::string, std::string)>("addEntry");
    return method(self(), name, state);
  }

};

class JFlipperClient : public jni::HybridClass<JFlipperClient> {
 public:
  constexpr static auto kJavaDescriptor = "Lcom/facebook/flipper/android/FlipperClientImpl;";

  static void registerNatives() {
    registerHybrid({
      makeNativeMethod("init", JFlipperClient::init),
      makeNativeMethod("getInstance", JFlipperClient::getInstance),
      makeNativeMethod("start", JFlipperClient::start),
      makeNativeMethod("stop", JFlipperClient::stop),
      makeNativeMethod("addPlugin", JFlipperClient::addPlugin),
      makeNativeMethod("removePlugin", JFlipperClient::removePlugin),
      makeNativeMethod("subscribeForUpdates", JFlipperClient::subscribeForUpdates),
      makeNativeMethod("unsubscribe", JFlipperClient::unsubscribe),
      makeNativeMethod("getPlugin", JFlipperClient::getPlugin),
      makeNativeMethod("getState", JFlipperClient::getState),
      makeNativeMethod("getStateSummary", JFlipperClient::getStateSummary),
    });
  }

  static jni::alias_ref<JFlipperClient::javaobject> getInstance(jni::alias_ref<jclass>) {
    static auto client = make_global(newObjectCxxArgs());
  	return client;
  }

  void start() {
  	FlipperClient::instance()->start();
  }

  void stop() {
  	FlipperClient::instance()->stop();
  }

  void addPlugin(jni::alias_ref<JFlipperPlugin> plugin) {
    auto wrapper = std::make_shared<JFlipperPluginWrapper>(make_global(plugin));
    FlipperClient::instance()->addPlugin(wrapper);
  }

  void removePlugin(jni::alias_ref<JFlipperPlugin> plugin) {
    auto client = FlipperClient::instance();
    client->removePlugin(client->getPlugin(plugin->identifier()));
  }

  void subscribeForUpdates(jni::alias_ref<JFlipperStateUpdateListener> stateListener) {
    auto client = FlipperClient::instance();
    mStateListener = std::make_shared<AndroidFlipperStateUpdateListener>(stateListener);
    client->setStateListener(mStateListener);
  }

  void unsubscribe() {
    auto client = FlipperClient::instance();
    mStateListener = nullptr;
    client->setStateListener(nullptr);
  }

  std::string getState() {
    return FlipperClient::instance()->getState();
  }

  jni::global_ref<JStateSummary::javaobject> getStateSummary() {
    auto summary = jni::make_global(JStateSummary::create());
    auto elements = FlipperClient::instance()->getStateElements();
    for (auto&& element : elements) {
      std::string status;
      switch (element.state_) {
        case State::in_progress: status = "IN_PROGRESS"; break;
        case State::failed: status = "FAILED"; break;
        case State::success: status = "SUCCESS"; break;
      }
      summary->addEntry(element.name_, status);
    }
    return summary;
  }

  jni::alias_ref<JFlipperPlugin> getPlugin(const std::string& identifier) {
    auto plugin = FlipperClient::instance()->getPlugin(identifier);
    if (plugin) {
      auto wrapper = std::static_pointer_cast<JFlipperPluginWrapper>(plugin);
      return wrapper->jplugin;
    } else {
      return nullptr;
    }
  }

  static void init(
      jni::alias_ref<jclass>,
      JEventBase* callbackWorker,
      JEventBase* connectionWorker,
      const std::string host,
      const std::string os,
      const std::string device,
      const std::string deviceId,
      const std::string app,
      const std::string appId,
      const std::string privateAppDirectory) {

    FlipperClient::init({
      {
        std::move(host),
        std::move(os),
        std::move(device),
        std::move(deviceId),
        std::move(app),
        std::move(appId),
        std::move(privateAppDirectory)
      },
      callbackWorker->eventBase(),
      connectionWorker->eventBase()
    });
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
  });
}

AndroidFlipperStateUpdateListener::AndroidFlipperStateUpdateListener(jni::alias_ref<JFlipperStateUpdateListener> stateListener) {
  jStateListener = jni::make_global(stateListener);
}

void AndroidFlipperStateUpdateListener::onUpdate() {
  jStateListener->onUpdate();
}
