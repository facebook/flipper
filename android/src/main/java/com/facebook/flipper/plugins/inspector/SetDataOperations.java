/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.inspector;

import androidx.core.util.Pair;
import com.facebook.flipper.core.FlipperDynamic;
import com.facebook.flipper.core.FlipperObject;
import javax.annotation.Nullable;

public final class SetDataOperations {
  private SetDataOperations() {}

  /**
   * Extracts the type hint and data from a FlipperObject that follows the Layout Editor protocol
   *
   * @param wrapper the object containing the elements
   * @return a pair of a nullable hint and the uncasted value as a FlipperDynamic
   */
  public static Pair<FlipperValueHint, FlipperDynamic> parseLayoutEditorMessage(
      FlipperObject wrapper) {
    final FlipperValueHint kind = FlipperValueHint.fromString(wrapper.getString("kind"));
    final FlipperDynamic value = wrapper.getDynamic("data");
    return new Pair<>(kind, value);
  }

  /** Each supported type of the Layout Editor protocol for values */
  public enum FlipperValueHint {
    STRING("string"),
    NUMBER("number"),
    OBJECT("object"),
    ARRAY("array"),
    NULL("null");

    public final String value;

    FlipperValueHint(String value) {
      this.value = value;
    }

    public static @Nullable FlipperValueHint fromString(String value) {
      for (FlipperValueHint hint : values()) {
        if (hint.value.equals(value)) {
          return hint;
        }
      }
      return null;
    }
  }
}
