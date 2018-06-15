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

#pragma once

#include <fbjni/fbjni.h>

namespace facebook {
namespace jni {

class JBuffer : public JavaClass<JBuffer> {
public:
  static constexpr const char* kJavaDescriptor = "Ljava/nio/Buffer;";

  void rewind() const;
};

// JNI's NIO support has some awkward preconditions and error reporting. This
// class provides much more user-friendly access.
class JByteBuffer : public JavaClass<JByteBuffer, JBuffer> {
 public:
  static constexpr const char* kJavaDescriptor = "Ljava/nio/ByteBuffer;";

  static local_ref<JByteBuffer> wrapBytes(uint8_t* data, size_t size);

  bool isDirect() const;

  uint8_t* getDirectBytes() const;
  size_t getDirectSize() const;
};

}}
