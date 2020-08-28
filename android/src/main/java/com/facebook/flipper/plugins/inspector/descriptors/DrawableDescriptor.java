/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.inspector.descriptors;

import android.graphics.Rect;
import android.graphics.drawable.Drawable;
import android.os.Build;
import android.view.View;
import com.facebook.flipper.core.FlipperDynamic;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.plugins.inspector.HighlightedOverlay;
import com.facebook.flipper.plugins.inspector.InspectorValue;
import com.facebook.flipper.plugins.inspector.Named;
import com.facebook.flipper.plugins.inspector.NodeDescriptor;
import com.facebook.flipper.plugins.inspector.SetDataOperations;
import com.facebook.flipper.plugins.inspector.Touch;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import javax.annotation.Nullable;

public class DrawableDescriptor extends NodeDescriptor<Drawable> {

  @Override
  public void init(Drawable node) {}

  @Override
  public String getId(Drawable node) {
    return Integer.toString(System.identityHashCode(node));
  }

  @Override
  public String getName(Drawable node) {
    return node.getClass().getSimpleName();
  }

  @Override
  public int getChildCount(Drawable node) {
    return 0;
  }

  @Override
  public @Nullable Object getChildAt(Drawable node, int index) {
    return null;
  }

  @Override
  public List<Named<FlipperObject>> getData(Drawable node) {
    final FlipperObject.Builder props = new FlipperObject.Builder();
    final Rect bounds = node.getBounds();

    props.put("left", InspectorValue.mutable(bounds.left));
    props.put("top", InspectorValue.mutable(bounds.top));
    props.put("right", InspectorValue.mutable(bounds.right));
    props.put("bottom", InspectorValue.mutable(bounds.bottom));

    if (hasAlphaSupport()) {
      props.put("alpha", InspectorValue.mutable(node.getAlpha()));
    }

    return Arrays.asList(new Named<>("Drawable", props.build()));
  }

  @Override
  public void setValue(
      Drawable node,
      String[] path,
      @Nullable SetDataOperations.FlipperValueHint kind,
      FlipperDynamic value) {
    final Rect bounds = node.getBounds();

    switch (path[0]) {
      case "Drawable":
        switch (path[1]) {
          case "left":
            bounds.left = value.asInt();
            node.setBounds(bounds);
            break;
          case "top":
            bounds.top = value.asInt();
            node.setBounds(bounds);
            break;
          case "right":
            bounds.right = value.asInt();
            node.setBounds(bounds);
            break;
          case "bottom":
            bounds.bottom = value.asInt();
            node.setBounds(bounds);
            break;
          case "alpha":
            node.setAlpha(value.asInt());
            break;
        }
        break;
    }
  }

  private static boolean hasAlphaSupport() {
    return Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT;
  }

  @Override
  public List<Named<String>> getAttributes(Drawable node) {
    return Collections.EMPTY_LIST;
  }

  @Override
  public void setHighlighted(Drawable node, boolean selected, boolean isAlignmentMode) {
    // Ensure we handle wrapping drawable
    Drawable.Callback callbacks = node.getCallback();
    while (callbacks instanceof Drawable) {
      callbacks = ((Drawable) callbacks).getCallback();
    }

    if (!(callbacks instanceof View)) {
      return;
    }

    final View callbackView = (View) callbacks;
    if (selected) {
      final Rect zero = new Rect();
      final Rect bounds = node.getBounds();
      HighlightedOverlay.setHighlighted(callbackView, zero, zero, bounds, isAlignmentMode);
    } else {
      HighlightedOverlay.removeHighlight(callbackView);
    }
  }

  @Override
  public void hitTest(Drawable node, Touch touch) {
    touch.finish();
  }

  @Override
  public @Nullable String getDecoration(Drawable obj) {
    return null;
  }

  @Override
  public boolean matches(String query, Drawable node) throws Exception {
    NodeDescriptor descriptor = descriptorForClass(Object.class);
    return descriptor.matches(query, node);
  }
}
