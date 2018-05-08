/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

package com.facebook.sonar.plugins.inspector.descriptors.utils;

import static com.facebook.sonar.plugins.inspector.InspectorValue.Type.Enum;

import android.support.v4.util.SimpleArrayMap;
import com.facebook.sonar.plugins.inspector.InspectorValue;

public class EnumMapping {
  private final SimpleArrayMap<String, Integer> mMapping = new SimpleArrayMap<>();
  private final String mDefaultKey;

  public EnumMapping(String defaultKey) {
    mDefaultKey = defaultKey;
  }

  public void put(String s, int i) {
    mMapping.put(s, i);
  }

  public InspectorValue get(final int i) {
    return get(i, true);
  }

  public InspectorValue get(final int i, final boolean mutable) {
    for (int ii = 0, count = mMapping.size(); ii < count; ii++) {
      if (mMapping.valueAt(ii) == i) {
        return mutable
            ? InspectorValue.mutable(Enum, mMapping.keyAt(ii))
            : InspectorValue.immutable(Enum, mMapping.keyAt(ii));
      }
    }
    return mutable
        ? InspectorValue.mutable(Enum, mDefaultKey)
        : InspectorValue.immutable(Enum, mDefaultKey);
  }

  public int get(String s) {
    if (mMapping.containsKey(s)) {
      return mMapping.get(s);
    }
    return mMapping.get(mDefaultKey);
  }
}
