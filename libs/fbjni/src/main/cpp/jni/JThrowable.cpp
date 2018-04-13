/*
 *  Copyright (c) 2015-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
#include "fb/fbjni.h"
#include <sstream>

std::string JThrowable::getStackTrace() const {
    static auto getStackTraceMethod = javaClassStatic()
  ->getMethod<facebook::jni::local_ref<facebook::jni::JThrowable::JStackTrace>()>("getStackTrace");

  std::ostringstream os;

  auto stackTrace = getStackTraceMethod(self());
  for (size_t i = 0; i < stackTrace->size(); ++i) {
      os << facebook::jni::adopt_local((*stackTrace)[i])->toString() << ' ';
  }

  return os.str();
}
