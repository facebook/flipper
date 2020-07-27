/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.litho;

import com.facebook.flipper.core.FlipperArray;
import com.facebook.flipper.core.FlipperDynamic;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.core.FlipperValue;
import com.facebook.flipper.plugins.inspector.InspectorValue;
import com.facebook.litho.editor.EditorRegistry;
import com.facebook.litho.editor.model.EditorArray;
import com.facebook.litho.editor.model.EditorBool;
import com.facebook.litho.editor.model.EditorNumber;
import com.facebook.litho.editor.model.EditorShape;
import com.facebook.litho.editor.model.EditorString;
import com.facebook.litho.editor.model.EditorValue;
import java.lang.reflect.Field;
import java.util.HashMap;
import java.util.Map;
import javax.annotation.Nullable;

/**
 * This class is responsible for making Litho Editor compatible with Flipper.
 *
 * <p>It provides methods to convert from FlipperDynamic, and to provide the description of a Prop
 * or State as a FlipperObject, FlipperArray or FlipperValue.
 */
public class FlipperEditor {
  /**
   * Uses an editor to create a FlipperObject, FlipperArray or FlipperValue to describe it. If no
   * editor is available then it returns the class name.
   */
  public static Object makeFlipperField(Object node, Field f) {
    Class<?> type = f.getType();
    final EditorValue editorValue = EditorRegistry.read(type, f, node);
    if (editorValue != null) {
      return intoFlipper(editorValue);
    } else {
      return InspectorValue.immutable(type.toString());
    }
  }

  /**
   * Uses an editor to update a field nested in an object path with the value of a FlipperDynamic.
   * If no editor is available then it returns null.
   *
   * <p>The path as defined by Flipper starts with either "Props" or "State" followed by the call
   * chain into the object. Fields retain their name, positions in an array use their index.
   */
  public static @Nullable Boolean updateComponent(
      String[] path, Field field, Object o, FlipperDynamic dynamic) {
    Object raw = dynamic.raw();
    EditorValue edit;
    if (raw instanceof String) {
      edit = EditorValue.string((String) raw);
    } else if (raw instanceof Number) {
      edit = EditorValue.number(((Number) raw));
    } else if (raw instanceof Boolean) {
      edit = EditorValue.bool((Boolean) raw);
    } else {
      edit = EditorValue.string(raw.toString());
    }
    for (int i = path.length - 1; i > 0; i--) {
      HashMap<String, EditorValue> content = new HashMap<>();
      content.put(path[i], edit);
      edit = EditorValue.shape(content);
    }
    return EditorRegistry.write(field.getType(), field, o, edit);
  }

  /** Converts into one of FlipperValue, FlipperObject, or FlipperArray */
  public static Object intoFlipper(EditorValue editorValue) {
    return editorValue.when(
        new EditorValue.EditorVisitor<Object>() {
          @Override
          public Object isShape(EditorShape object) {
            FlipperObject.Builder bb = new FlipperObject.Builder();

            for (Map.Entry<String, EditorValue> entry : object.value.entrySet()) {
              bb.put(entry.getKey(), intoFlipper(entry.getValue()));
            }

            return bb.build();
          }

          @Override
          public Object isArray(EditorArray array) {
            FlipperArray.Builder bb = new FlipperArray.Builder();

            for (EditorValue entry : array.value) {
              Object flipper = intoFlipper(entry);
              if (flipper instanceof FlipperValue) {
                bb.put((FlipperValue) flipper);
              } else if (flipper instanceof FlipperObject) {
                bb.put((FlipperObject) flipper);
              } else if (flipper instanceof FlipperArray) {
                bb.put((FlipperArray) flipper);
              }
            }

            return bb.build();
          }

          @Override
          public Object isNumber(EditorNumber number) {
            return InspectorValue.mutable(number.value);
          }

          @Override
          public Object isString(EditorString string) {
            return InspectorValue.mutable(string.value);
          }

          @Override
          public Object isBool(EditorBool bool) {
            return InspectorValue.mutable(bool.value);
          }
        });
  }
}
