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
import com.facebook.flipper.plugins.inspector.SetDataOperations;
import com.facebook.litho.editor.EditorRegistry;
import com.facebook.litho.editor.model.EditorArray;
import com.facebook.litho.editor.model.EditorBool;
import com.facebook.litho.editor.model.EditorNumber;
import com.facebook.litho.editor.model.EditorShape;
import com.facebook.litho.editor.model.EditorString;
import com.facebook.litho.editor.model.EditorValue;
import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
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
      String[] path,
      Field field,
      Object o,
      final @Nullable SetDataOperations.FlipperValueHint hint,
      FlipperDynamic dynamic) {
    EditorValue edit = parseEditorValue(hint, dynamic);
    for (int i = path.length - 1; i > 0; i--) {
      HashMap<String, EditorValue> content = new HashMap<>();
      content.put(path[i], edit);
      edit = EditorValue.shape(content);
    }
    return EditorRegistry.write(field.getType(), field, o, edit);
  }

  /**
   * Layout Plugin supports a protocol that tags the type of all messages. This enables support for
   * heterogeneous Maps and Arrays.
   *
   * @param hint type hint for the FlipperDynamic parameter
   * @param dynamic The value produced by the Flipper user
   * @return an EditorValue extracted from dynamic
   */
  private static EditorValue parseEditorValue(
      @Nullable SetDataOperations.FlipperValueHint hint, FlipperDynamic dynamic) {
    // TODO(festevezga) - Remove educated guess when the Layout Plugin is updated to produce tagged
    // messages
    return hint == null ? guessEditorValue(dynamic) : extractEditorValue(hint, dynamic);
  }

  private static EditorValue guessEditorValue(FlipperDynamic dynamic) {
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
    return edit;
  }

  /**
   * This method flattens the Layout Editor messages using the type hints, recursively.
   *
   * @param hint type hint for the FlipperDynamic parameter
   * @param dynamic The value produced by the Flipper user
   * @return an EditorValue extracted from dynamic
   */
  private static EditorValue extractEditorValue(
      SetDataOperations.FlipperValueHint hint, FlipperDynamic dynamic) {
    switch (hint) {
      case STRING:
        return EditorValue.string(dynamic.asString());
      case NUMBER:
        return EditorValue.number(dynamic.asDouble());
      case OBJECT:
        return EditorValue.shape(parseObject(dynamic.asObject()));
      case ARRAY:
        return EditorValue.array(parseArray(dynamic.asArray()));
      case NULL:
        // TODO(festevezga) - add support for null
        return EditorValue.string("null");
      default:
        // Java switch isn't exhaustive before Java 13
        return EditorValue.string("If you see this, report an error to the Flipper repository");
    }
  }

  private static Map<String, EditorValue> parseObject(FlipperObject flipperObject) {
    final Iterator<String> keys = flipperObject.keys();
    final Map<String, EditorValue> values = new HashMap<>();
    while (keys.hasNext()) {
      final String field = keys.next();
      final FlipperObject object = flipperObject.getObject(field);
      final SetDataOperations.HintedFlipperDynamic value =
          SetDataOperations.parseLayoutEditorMessage(object);
      values.put(field, parseEditorValue(value.kind, value.value));
    }
    return values;
  }

  private static List<EditorValue> parseArray(FlipperArray flipperArray) {
    ArrayList<EditorValue> values = new ArrayList<>();
    for (int i = 0; i < flipperArray.length(); i++) {
      final FlipperObject object = flipperArray.getObject(i);
      final SetDataOperations.HintedFlipperDynamic value =
          SetDataOperations.parseLayoutEditorMessage(object);
      values.add(parseEditorValue(value.kind, value.value));
    }

    return values;
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
