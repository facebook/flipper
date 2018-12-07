/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the LICENSE
 * file in the root directory of this source tree.
 */
#ifndef __OBJC__
#error This header can only be included in .mm (ObjC++) files
#endif

#if FB_SONARKIT_ENABLED

#pragma once

#include <folly/io/async/AsyncSignalHandler.h>
#import "FlipperKitCrashReporterPlugin.h"
#import <FBCxxUtils/FBCxxFollyDynamicConvert.h>
#include <folly/io/async/ScopedEventBaseThread.h>
#include <execinfo.h>
#include <iostream>
#include <mutex>
#include <chrono>

namespace facebook {
  namespace flipper {
    using ObjCPlugin = NSObject<CrashReporterDelegate> *;

    class FlipperKitSignalHandler : public folly::AsyncSignalHandler {
      
      struct CrashDetails {
        int signalType;
        std::string reason;
        std::vector<std::string> callStack;
        NSTimeInterval time; //In milliseconds
        
        bool operator==(const CrashDetails& rhs)
        {
          return signalType == rhs.signalType && reason == rhs.reason && callStack == rhs.callStack && (abs(rhs.time - time) < 10);
        }
        
        bool operator!=(const CrashDetails& rhs) {
          return !(*this == rhs);
        }

        
      };
      
    public:
      FlipperKitSignalHandler(ObjCPlugin reporterPlugin, folly::EventBase *eventBase): folly::AsyncSignalHandler(eventBase), plugin_(reporterPlugin), eventbase_(eventBase) {

        eventBase->add([this]{
          registerSignalHandler(SIGILL);
          registerSignalHandler(SIGSEGV);
          registerSignalHandler(SIGFPE);
          registerSignalHandler(SIGBUS);
          registerSignalHandler(SIGABRT);
        });
        }

      void unregisterSignalHandler() {
        folly::AsyncSignalHandler::unregisterSignalHandler(SIGILL);  // illegal instruction
        folly::AsyncSignalHandler::unregisterSignalHandler(SIGSEGV); // segmentation violation
        folly::AsyncSignalHandler::unregisterSignalHandler(SIGFPE);  // floating point exception
        folly::AsyncSignalHandler::unregisterSignalHandler(SIGBUS);  // Bus error
        folly::AsyncSignalHandler::unregisterSignalHandler(SIGABRT); // Abort
      }

      ~FlipperKitSignalHandler() {
        unregisterSignalHandler();
        plugin_ = nullptr;
      }

    private:
      ObjCPlugin plugin_;
      folly::EventBase *eventbase_;
      std::mutex mtx;
      CrashDetails lastCrashDetails_;
      
      std::string signalType(int signal) {
        switch (signal) {
          case SIGILL:
            return "SIGILL";
          case SIGSEGV:
            return "SIGSEGV";
          case SIGFPE:
            return "SIGFPE";
          case SIGBUS:
            return "SIGBUS";
          case SIGABRT:
            return "SIGABRT";
          default:
            return "Unregistered Signal";
        }
      }

      std::string reasonForSignalError(int signal) {
        switch (signal) {
          case SIGILL:
            return "Illegal Instruction";
          case SIGSEGV:
            return "Segmentation Violation";
          case SIGFPE:
            return "Floating Point Exception";
          case SIGBUS:
            return "Bus Error";
          case SIGABRT:
            return "Abort Signal";
          default:
            return "Unregistered Signal";
        }
      }

      void signalReceived(int signum) noexcept override {
        void* callstack[2048];
        int frames = backtrace(callstack, 2048);
        char **strs = backtrace_symbols(callstack, frames);
        folly::dynamic arr = folly::dynamic::array();
        std::vector<std::string> vec;
        for (int i = 0; i < frames; ++i) {
          NSString *str = [NSString stringWithUTF8String:strs[i]];
          vec.push_back(std::string([str UTF8String]));
          arr.push_back(std::string([str UTF8String]));
        }
        std::string reasonforSignalError = reasonForSignalError(signum);
        CrashDetails currentCrash({signum, reasonforSignalError, vec, [[NSDate date] timeIntervalSince1970] * 1000});
        // This check is added, because I reproduced a scenario where lot of signal errors of same kind were thrown in a short period of span. So this basically makes sure that we just send one notification.
        // To reproduce that case, use this snippet `void (*nullFunction)() = NULL; nullFunction();`, it will cause segfault.
        if (lastCrashDetails_ != currentCrash) {
          [plugin_ sendCrashParams:facebook::cxxutils::convertFollyDynamicToId(folly::dynamic::object("reason", reasonforSignalError)("name", std::string("Signal Error ") + signalType(signum))("callstack", arr))];
          
          eventbase_->runAfterDelay([this, signum]{
            unregisterSignalHandler(); // Unregister signal handler as we will be reraising the signal.
            // Raising the signal after delay, because message is sent in an asyncronous way to flipper. If its raised with no delay then its observed that flipper doesn't receive the message
            raise(signum);}, 10);
        }
        lastCrashDetails_ = currentCrash;
      }

    };

  } // namespace flipper
} // namespace facebook
#endif
