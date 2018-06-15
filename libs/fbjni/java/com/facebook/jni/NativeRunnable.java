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
package com.facebook.jni;

import com.facebook.jni.annotations.DoNotStrip;

/** A Runnable that has a native run implementation. */
@DoNotStrip
public class NativeRunnable implements Runnable {

  private final HybridData mHybridData;

  private NativeRunnable(HybridData hybridData) {
    mHybridData = hybridData;
  }

  public native void run();
}
