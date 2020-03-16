/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.inspector;

import java.lang.ref.SoftReference;
import java.util.HashMap;
import java.util.Map;
import javax.annotation.Nullable;

public class ObjectTracker {
  public ObjectTracker() {}

  private final Map<String, SoftReference<Object>> mObjects = new HashMap<>();

  public void put(String id, Object obj) {
    mObjects.put(id, new SoftReference<>(obj));
  }

  @Nullable
  public Object get(String id) {
    final SoftReference<Object> softRef = mObjects.get(id);
    if (softRef == null) {
      return null;
    }

    final Object obj = softRef.get();
    if (obj == null) {
      mObjects.remove(id);
    }

    return obj;
  }

  public void clear() {
    mObjects.clear();
  }

  public boolean contains(String id) {
    return mObjects.containsKey(id);
  }
}
