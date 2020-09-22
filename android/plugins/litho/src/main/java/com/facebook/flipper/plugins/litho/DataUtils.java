/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.litho;

import static com.facebook.flipper.plugins.inspector.InspectorValue.Type.Color;

import android.graphics.drawable.ColorDrawable;
import android.graphics.drawable.Drawable;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.plugins.inspector.InspectorValue;
import com.facebook.flipper.plugins.inspector.Named;
import com.facebook.litho.StateContainer;
import com.facebook.litho.annotations.Prop;
import com.facebook.litho.annotations.State;
import com.facebook.litho.drawable.ComparableColorDrawable;
import com.facebook.litho.editor.flipper.FlipperEditor;
import java.lang.reflect.Field;
import java.util.AbstractMap;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import javax.annotation.Nullable;

public class DataUtils {

  static List<Named<FlipperObject>> getPropData(Object node) throws Exception {
    final FlipperObject.Builder props = new FlipperObject.Builder();
    List<Named<FlipperObject>> data = new ArrayList<>();

    boolean hasProps = false;

    for (Field f : node.getClass().getDeclaredFields()) {
      f.setAccessible(true);

      final Prop annotation = f.getAnnotation(Prop.class);
      if (annotation != null) {
        if (f.get(node) != null
            && PropWithInspectorSection.class.isAssignableFrom(f.get(node).getClass())) {
          final AbstractMap.SimpleEntry<String, String> datum =
              ((PropWithInspectorSection) f.get(node)).getFlipperLayoutInspectorSection();
          if (datum != null) {
            data.add(new Named<>(datum.getKey(), new FlipperObject(datum.getValue())));
          }
        }

        switch (annotation.resType()) {
          case COLOR:
            props.put(f.getName(), f.get(node) == null ? "null" : fromColor((Integer) f.get(node)));
            break;
          case DRAWABLE:
            props.put(
                f.getName(), f.get(node) == null ? "null" : fromDrawable((Drawable) f.get(node)));
            break;
          default:
            if (f.get(node) != null
                && PropWithDescription.class.isAssignableFrom(f.get(node).getClass())) {
              final Object description =
                  ((PropWithDescription) f.get(node)).getFlipperLayoutInspectorPropDescription();
              // Treat the description as immutable for now, because it's a "translation" of the
              // actual prop,
              // mutating them is not going to change the original prop.
              if (description instanceof Map<?, ?>) {
                final Map<?, ?> descriptionMap = (Map<?, ?>) description;
                for (Map.Entry<?, ?> entry : descriptionMap.entrySet()) {
                  props.put(entry.getKey().toString(), InspectorValue.immutable(entry.getValue()));
                }
              } else {
                props.put(f.getName(), InspectorValue.immutable(description));
              }
            } else {
              props.put(f.getName(), FlipperEditor.makeFlipperField(node, f));
            }
            break;
        }
        hasProps = true;
      }
    }

    if (hasProps) {
      data.add(new Named<>("Props", props.build()));
    }

    return data;
  }

  @Nullable
  static FlipperObject getStateData(StateContainer stateContainer) {
    if (stateContainer == null) {
      return null;
    }

    final FlipperObject.Builder state = new FlipperObject.Builder();

    boolean hasState = false;
    for (Field f : stateContainer.getClass().getDeclaredFields()) {
      f.setAccessible(true);

      final State annotation = f.getAnnotation(State.class);
      if (annotation != null) {
        state.put(f.getName(), FlipperEditor.makeFlipperField(stateContainer, f));
        hasState = true;
      }
    }

    return hasState ? state.build() : null;
  }

  static InspectorValue fromDrawable(Drawable d) {
    int color = 0;
    if (d instanceof ColorDrawable) {
      color = ((ColorDrawable) d).getColor();
    } else if (d instanceof ComparableColorDrawable) {
      color = ((ComparableColorDrawable) d).getColor();
    }
    return InspectorValue.mutable(Color, color);
  }

  static InspectorValue fromColor(int color) {
    return InspectorValue.mutable(Color, color);
  }
}
