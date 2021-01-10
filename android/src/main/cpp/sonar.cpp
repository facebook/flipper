/*
 * Copyright (c) Facebook, Inc. and its affiliates.
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

#include <folly/io/async/EventBase.h>
#include <folly/io/async/EventBaseManager.h>
#include <folly/json.h>

#include <Flipper/FlipperClient.h>
#include <Flipper/FlipperConnection.h>
#include <Flipper/FlipperConnectionManager.h>
#include <Flipper/FlipperResponder.h>
#include <Flipper/FlipperState.h>
#include <Flipper/FlipperStateUpdateListener.h>

using namespace facebook;
using namespace facebook::flipper;

namespace {

void handleException(const std::exception& e) {
  std::string message = "Exception caught in C++ and suppressed: ";
  message += e.what();
  __android_log_write(ANDROID_LOG_ERROR, "FLIPPER", message.c_str());
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
        makeNativeMethod("reportError", JFlipperConnectionImpl::reportError),
        makeNativeMethod(
            "reportErrorWithMetadata",
            JFlipperConnectionImpl::reportErrorWithMetadata),
        makeNativeMethod("receive", JFlipperConnectionImpl::receive),
    });
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
      const std::string host,
      const std::string os,
      const std::string device,
      const std::string deviceId,
      const std::string app,
      const std::string appId,
      const std::string privateAppDirectory) {
    FlipperClient::init(
        {{std::move(host),
          std::move(os),
          std::move(device),
          std::move(deviceId),
          std::move(app),
          std::move(appId),
          std::move(privateAppDirectory)},
         callbackWorker->eventBase(),
         connectionWorker->eventBase(),
         insecurePort,
         securePort});
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

AndroidFlipperStateUpdateListener::AndroidFlipperStateUpdateListener(
    jni::alias_ref<JFlipperStateUpdateListener> stateListener) {
  jStateListener = jni::make_global(stateListener);
}

void AndroidFlipperStateUpdateListener::onUpdate() {
  jStateListener->onUpdate();
}
