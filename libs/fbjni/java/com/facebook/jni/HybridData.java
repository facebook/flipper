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

/**
 * This object holds a native C++ member for hybrid Java/C++ objects.
 *
 * <p>NB: THREAD SAFETY
 *
 * <p>{@link #resetNative} deletes the corresponding native object synchronously on whatever thread
 * the method is called on. Otherwise, deletion will occur on the {@link DestructorThread} thread.
 */
@DoNotStrip
public class HybridData {

  static {
    SoLoader.loadLibrary("fbjni");
  }

  @DoNotStrip private Destructor mDestructor = new Destructor(this);

  /**
   * To explicitly delete the instance, call resetNative(). If the C++ instance is referenced after
   * this is called, a NullPointerException will be thrown. resetNative() may be called multiple
   * times safely. Because the {@link DestructorThread} also calls resetNative, the instance will
   * not leak if this is not called, but timing of deletion and the thread the C++ dtor is called on
   * will be at the whim of the Java GC. If you want to control the thread and timing of the
   * destructor, you should call resetNative() explicitly.
   */
  public synchronized void resetNative() {
    mDestructor.destruct();
  }

  /**
   * N.B. Thread safety. If you call isValid from a different thread than {@link #resetNative()}
   * then be sure to do so while synchronizing on the hybrid. For example:
   *
   * <pre><code>
   * synchronized(hybrid) {
   *   if (hybrid.isValid) {
   *     // Do stuff.
   *   }
   * }
   * </code></pre>
   */
  public boolean isValid() {
    return mDestructor.mNativePointer != 0;
  }

  public static class Destructor extends DestructorThread.Destructor {

    // Private C++ instance
    @DoNotStrip private long mNativePointer;

    Destructor(Object referent) {
      super(referent);
    }

    @Override
    void destruct() {
      // When invoked from the DestructorThread instead of resetNative,
      // the DestructorThread has exclusive ownership of the HybridData
      // so synchronization is not necessary.
      deleteNative(mNativePointer);
      mNativePointer = 0;
    }

    static native void deleteNative(long pointer);
  }
}
