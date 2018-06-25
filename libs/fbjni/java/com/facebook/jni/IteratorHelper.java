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
import java.util.Iterator;
import javax.annotation.Nullable;

/**
 * To iterate over an Iterator from C++ requires two calls per entry: hasNext() and next(). This
 * helper reduces it to one call and one field get per entry. It does not use a generic argument,
 * since in C++, the types will be erased, anyway. This is *not* a {@link java.util.Iterator}.
 */
@DoNotStrip
public class IteratorHelper {
  private final Iterator mIterator;

  // This is private, but accessed via JNI.
  @DoNotStrip private @Nullable Object mElement;

  @DoNotStrip
  public IteratorHelper(Iterator iterator) {
    mIterator = iterator;
  }

  @DoNotStrip
  public IteratorHelper(Iterable iterable) {
    mIterator = iterable.iterator();
  }

  /**
   * Moves the helper to the next entry in the map, if any. Returns true iff there is an entry to
   * read.
   */
  @DoNotStrip
  boolean hasNext() {
    if (mIterator.hasNext()) {
      mElement = mIterator.next();
      return true;
    } else {
      mElement = null;
      return false;
    }
  }
}
