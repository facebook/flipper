/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.inspector.descriptors;

import android.content.Context;
import android.util.Log;
import android.util.TypedValue;
import android.view.View;
import android.view.Window;
import com.facebook.flipper.core.FlipperDynamic;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.plugins.inspector.Named;
import com.facebook.flipper.plugins.inspector.NodeDescriptor;
import com.facebook.flipper.plugins.inspector.SetDataOperations;
import com.facebook.flipper.plugins.inspector.Touch;
import java.lang.reflect.Field;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import javax.annotation.Nullable;

public class WindowDescriptor extends NodeDescriptor<Window> {
  private static Class internalRStyleableClass;
  private static Object internalRStyleable;
  private static Field[] internalRStyleableFields;
  private static Field internalRStyleableWindowField;

  @Override
  public void init(Window node) {}

  @Override
  public String getId(Window node) {
    return Integer.toString(System.identityHashCode(node));
  }

  @Override
  public String getName(Window node) {
    return node.getClass().getSimpleName();
  }

  @Override
  public int getChildCount(Window node) {
    return 1;
  }

  @Override
  public Object getChildAt(Window node, int index) {
    return node.getDecorView();
  }

  @Override
  public List<Named<FlipperObject>> getData(Window node) {
    FlipperObject.Builder windowAttrs = new FlipperObject.Builder();
    try {
      if (internalRStyleableClass == null) {
        internalRStyleableClass = Class.forName("com.android.internal.R$styleable");
        internalRStyleable = internalRStyleableClass.newInstance();
        internalRStyleableFields = internalRStyleableClass.getDeclaredFields();
        internalRStyleableWindowField = internalRStyleableClass.getDeclaredField("Window");
        internalRStyleableWindowField.setAccessible(true);
      }

      Context c = node.getContext();

      int[] windowStyleable = (int[]) internalRStyleableWindowField.get(internalRStyleable);

      Map<Integer, String> indexToName = new HashMap<>();
      for (Field f : internalRStyleableFields) {
        if (!f.getName().startsWith("Window_")) {
          continue;
        }
        if (f.getType() != int.class) {
          continue;
        }
        indexToName.put(f.getInt(internalRStyleable), f.getName());
      }

      int index = 0;
      TypedValue typedValue = new TypedValue();
      for (int attr : windowStyleable) {
        String fieldName = indexToName.get(index);
        ++index;
        if (fieldName == null) {
          continue;
        }

        if (c.getTheme().resolveAttribute(attr, typedValue, true)) {
          String strValue = TypedValue.coerceToString(typedValue.type, typedValue.data);
          if (strValue == null) {
            strValue = "null";
          } else if (strValue.startsWith("@")) {
            int resId = Integer.parseInt(strValue.substring(1));
            if (resId == 0) {
              strValue = "null";
            } else {
              strValue = c.getResources().getResourceName(resId);
            }
          }
          windowAttrs.put(fieldName.substring(7), strValue); // 7 is the length of "Window_"
        }
      }
    } catch (Throwable ignored) {
      Log.d("WindowDescriptor", "Failed to generate a window descriptor!", ignored);
    }
    return Collections.singletonList(new Named<>("Window", windowAttrs.build()));
  }

  @Override
  public void setValue(
      Window node,
      String[] path,
      @Nullable SetDataOperations.FlipperValueHint kind,
      FlipperDynamic value) {}

  @Override
  public List<Named<String>> getAttributes(Window node) {
    return Collections.EMPTY_LIST;
  }

  @Override
  public void setHighlighted(Window node, boolean selected, boolean isAlignmentMode)
      throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(View.class);
    descriptor.setHighlighted(node.getDecorView(), selected, isAlignmentMode);
  }

  @Override
  public void hitTest(Window node, Touch touch) {
    touch.continueWithOffset(0, 0, 0);
  }

  @Override
  public @Nullable String getDecoration(Window obj) {
    return null;
  }

  @Override
  public boolean matches(String query, Window node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(Object.class);
    return descriptor.matches(query, node);
  }
}
