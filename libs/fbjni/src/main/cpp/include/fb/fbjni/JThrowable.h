/*
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
#pragma once
#include "CoreClasses.h"

struct JThrowable : public facebook::jni::JavaClass<JThrowable, facebook::jni::JThrowable> {
  constexpr static auto kJavaDescriptor = "Ljava/lang/Throwable;";

  std::string getStackTrace() const;
};
