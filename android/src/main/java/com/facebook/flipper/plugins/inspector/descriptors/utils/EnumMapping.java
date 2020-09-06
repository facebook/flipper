/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.inspector.descriptors.utils;

import static com.facebook.flipper.plugins.inspector.InspectorValue.Type.Enum;
import static com.facebook.flipper.plugins.inspector.InspectorValue.Type.Picker;

import androidx.collection.ArrayMap;
import androidx.collection.SimpleArrayMap;
import com.facebook.flipper.plugins.inspector.InspectorValue;

public class EnumMapping {
  private final ArrayMap<String, Integer> mMapping = new ArrayMap<>();
  private final String mDefaultKey;

  public EnumMapping(final String defaultKey) {
    mDefaultKey = defaultKey;
  }

  public void put(final String s, final int i) {
    mMapping.put(s, i);
  }

  public InspectorValue get(final int i) {
    return get(i, true);
  }

  public static String findKeyForValue(
      SimpleArrayMap<String, Integer> mapping, String mDefaultValue, int currentValue) {
    for (int i = 0, count = mapping.size(); i < count; i++) {
      if (mapping.valueAt(i).equals(currentValue)) {
        return mapping.keyAt(i);
      }
    }
    return mDefaultValue;
  }

  public InspectorValue get(final int i, final boolean mutable) {
    String value = findKeyForValue(mMapping, mDefaultKey, i);
    return mutable ? InspectorValue.mutable(Enum, value) : InspectorValue.immutable(Enum, value);
  }

  public int get(final String s) {
    if (mMapping.containsKey(s)) {
      return mMapping.get(s);
    }
    return mMapping.get(mDefaultKey);
  }

  public InspectorValue toPicker() {
    return toPicker(true);
  }

  public InspectorValue toPicker(final boolean mutable) {
    return mutable
        ? InspectorValue.mutable(Picker, new InspectorValue.Picker(mMapping.keySet(), mDefaultKey))
        : InspectorValue.immutable(Enum, mDefaultKey);
  }

  public InspectorValue toPicker(final int currentValue) {
    return toPicker(currentValue, true);
  }

  public InspectorValue toPicker(final int currentValue, final boolean mutable) {
    String value = findKeyForValue(mMapping, mDefaultKey, currentValue);
    return mutable
        ? InspectorValue.mutable(Picker, new InspectorValue.Picker(mMapping.keySet(), value))
        : InspectorValue.immutable(Enum, value);
  }
}
