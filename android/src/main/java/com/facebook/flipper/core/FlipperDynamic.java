/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.core;

import javax.annotation.Nullable;
import org.json.JSONArray;
import org.json.JSONObject;

public class FlipperDynamic {
  private final Object mObject;

  public FlipperDynamic(Object object) {
    mObject = object;
  }

  public Object raw() {
    return mObject;
  }

  public @Nullable String asString() {
    if (mObject == null) {
      return null;
    }
    return mObject.toString();
  }

  public int asInt() {
    if (mObject == null) {
      return 0;
    }
    if (mObject instanceof Integer) {
      return (Integer) mObject;
    }
    if (mObject instanceof Long) {
      return ((Long) mObject).intValue();
    }
    if (mObject instanceof Float) {
      return ((Float) mObject).intValue();
    }
    if (mObject instanceof Double) {
      return ((Double) mObject).intValue();
    }
    return 0;
  }

  public long asLong() {
    if (mObject == null) {
      return 0;
    }
    if (mObject instanceof Integer) {
      return (Integer) mObject;
    }
    if (mObject instanceof Long) {
      return (Long) mObject;
    }
    if (mObject instanceof Float) {
      return ((Float) mObject).longValue();
    }
    if (mObject instanceof Double) {
      return ((Double) mObject).longValue();
    }
    return 0;
  }

  public float asFloat() {
    if (mObject == null) {
      return 0;
    }
    if (mObject instanceof Integer) {
      return (Integer) mObject;
    }
    if (mObject instanceof Long) {
      return (Long) mObject;
    }
    if (mObject instanceof Float) {
      return (Float) mObject;
    }
    if (mObject instanceof Double) {
      return ((Double) mObject).floatValue();
    }
    return 0;
  }

  public double asDouble() {
    if (mObject == null) {
      return 0;
    }
    if (mObject instanceof Integer) {
      return (Integer) mObject;
    }
    if (mObject instanceof Long) {
      return (Long) mObject;
    }
    if (mObject instanceof Float) {
      return (Float) mObject;
    }
    if (mObject instanceof Double) {
      return (Double) mObject;
    }
    return 0;
  }

  public boolean asBoolean() {
    if (mObject == null) {
      return false;
    }
    return (Boolean) mObject;
  }

  public FlipperObject asObject() {
    if (mObject instanceof JSONObject) {
      return new FlipperObject((JSONObject) mObject);
    }
    return (FlipperObject) mObject;
  }

  public FlipperArray asArray() {
    if (mObject instanceof JSONArray) {
      return new FlipperArray((JSONArray) mObject);
    }
    return (FlipperArray) mObject;
  }
}
