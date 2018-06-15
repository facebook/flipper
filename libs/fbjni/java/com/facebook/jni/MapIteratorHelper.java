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
import java.util.Map;
import javax.annotation.Nullable;

/**
 * To iterate over a Map from C++ requires four calls per entry: hasNext(), next(), getKey(),
 * getValue(). This helper reduces it to one call and two field gets per entry. It does not use a
 * generic argument, since in C++, the types will be erased, anyway. This is *not* a {@link
 * java.util.Iterator}.
 */
@DoNotStrip
public class MapIteratorHelper {
  @DoNotStrip private final Iterator<Map.Entry> mIterator;
  @DoNotStrip private @Nullable Object mKey;
  @DoNotStrip private @Nullable Object mValue;

  @DoNotStrip
  public MapIteratorHelper(Map map) {
    mIterator = map.entrySet().iterator();
  }

  /**
   * Moves the helper to the next entry in the map, if any. Returns true iff there is an entry to
   * read.
   */
  @DoNotStrip
  boolean hasNext() {
    if (mIterator.hasNext()) {
      Map.Entry entry = mIterator.next();
      mKey = entry.getKey();
      mValue = entry.getValue();
      return true;
    } else {
      mKey = null;
      mValue = null;
      return false;
    }
  }
}
