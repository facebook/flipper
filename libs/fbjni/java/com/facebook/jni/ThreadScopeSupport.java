/**
 * Copyright 2004-present, Facebook, Inc.
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

package com.facebook.jni;

import com.facebook.jni.annotations.DoNotStrip;
import com.facebook.soloader.SoLoader;

@DoNotStrip
public class ThreadScopeSupport {
  static {
    SoLoader.loadLibrary("fbjni");
  }

  // This is just used for ThreadScope::withClassLoader to have a java function
  // in the stack so that jni has access to the correct classloader.
  @DoNotStrip
  private static void runStdFunction(long ptr) {
    runStdFunctionImpl(ptr);
  }

  private static native void runStdFunctionImpl(long ptr);
}
