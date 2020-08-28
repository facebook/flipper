/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.inspector;

import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.core.FlipperValue;
import java.util.Set;

public class InspectorValue<T> implements FlipperValue {

  /**
   * Describe the type of data this value contains. This will influence how values are parsed and
   * displayed by the Flipper desktop app. For example colors will be parse as integers and
   * displayed using hex values and be editable using a color picker.
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
    public static final Type<Picker> Picker = new Type<>("picker");

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
  public FlipperObject toFlipperObject() {
    return new FlipperObject.Builder()
        .put("__type__", mType)
        .put("__mutable__", mMutable)
        .put("value", mValue)
        .build();
  }

  public static final class Picker {
    public final Set<String> values;
    public final String selected;

    public Picker(Set<String> values, String selected) {
      this.values = values;
      this.selected = selected;
    }

    @Override
    public String toString() {
      // FIXME(festevezga) - Manually rolled json, #noragrets
      StringBuilder b = new StringBuilder();
      b.append("{ \"values\": ");
      b.append("[");
      int i = values.size();
      for (String value : values) {
        b.append('"').append(value).append('"');
        i--;
        if (i != 0) {
          b.append(",");
        }
      }
      b.append("]");
      b.append(", \"selected\": \"");
      b.append(selected);
      b.append("\"}");
      return b.toString();
    }
  }
}
