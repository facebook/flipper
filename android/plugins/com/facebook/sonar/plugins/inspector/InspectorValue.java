/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

package com.facebook.sonar.plugins.inspector;

import com.facebook.sonar.core.SonarObject;
import com.facebook.sonar.core.SonarValue;

public class InspectorValue<T> implements SonarValue {

  /**
   * Descrive the type of data this value contains. This will influence how values are parsed and
   * displayed by the Sonar desktop app. For example colors will be parse as integers and displayed
   * using hex values and be editable using a color picker.
   *
   * <p>Do not extends this list of types without adding support for the type in the desktop
   * Inspector.
   */
  public static class Type<T> {

    public static final Type Auto = new Type<>("auto");
    public static final Type<String> Text = new Type<>("text");
    public static final Type<Number> Number = new Type<>("number");
    public static final Type<Boolean> Boolean = new Type<>("boolean");
    public static final Type<String> Enum = new Type<>("enum");
    public static final Type<Integer> Color = new Type<>("color");

    private final String mName;

    Type(String name) {
      mName = name;
    }

    @Override
    public String toString() {
      return mName;
    }
  }

  final Type<T> mType;
  final T mValue;
  final boolean mMutable;

  private InspectorValue(Type<T> type, T value, boolean mutable) {
    mType = type;
    mValue = value;
    mMutable = mutable;
  }

  public static <T> InspectorValue<T> mutable(Type<T> type, T value) {
    return new InspectorValue<>(type, value, true);
  }

  public static <T> InspectorValue<T> immutable(Type<T> type, T value) {
    return new InspectorValue<>(type, value, false);
  }

  public static InspectorValue mutable(Object value) {
    return new InspectorValue<>(Type.Auto, value, true);
  }

  public static InspectorValue immutable(Object value) {
    return new InspectorValue<>(Type.Auto, value, false);
  }

  @Override
  public SonarObject toSonarObject() {
    return new SonarObject.Builder()
        .put("__type__", mType)
        .put("__mutable__", mMutable)
        .put("value", mValue)
        .build();
  }
}
