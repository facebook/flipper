/**
 * Copyright 2018-present, Facebook, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

#include "References.h"

namespace facebook {
namespace jni {

JniLocalScope::JniLocalScope(JNIEnv* env, jint capacity)
    : env_(env) {
  hasFrame_ = false;
  auto pushResult = env->PushLocalFrame(capacity);
  FACEBOOK_JNI_THROW_EXCEPTION_IF(pushResult < 0);
  hasFrame_ = true;
}

JniLocalScope::~JniLocalScope() {
  if (hasFrame_) {
    env_->PopLocalFrame(nullptr);
  }
}

namespace {

#ifdef __ANDROID__

int32_t getAndroidApiLevel() {
  auto cls = findClassLocal("android/os/Build$VERSION");
  auto fld = cls->getStaticField<int32_t>("SDK_INT");
  if (fld) {
    return cls->getStaticFieldValue(fld);
  }
  return 0;
}

bool doesGetObjectRefTypeWork() {
  auto level = getAndroidApiLevel();
  return level >= 14;
}

#else

bool doesGetObjectRefTypeWork() {
  auto jni_version = Environment::current()->GetVersion();
  return jni_version >= JNI_VERSION_1_6;
}

#endif

}

bool isObjectRefType(jobject reference, jobjectRefType refType) {
  static bool getObjectRefTypeWorks = doesGetObjectRefTypeWork();

  return
    !reference ||
    !getObjectRefTypeWorks ||
    Environment::current()->GetObjectRefType(reference) == refType;
}

}
}
