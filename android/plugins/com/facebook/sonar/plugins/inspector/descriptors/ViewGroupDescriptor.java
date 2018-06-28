/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

package com.facebook.sonar.plugins.inspector.descriptors;

import static android.support.v4.view.ViewGroupCompat.LAYOUT_MODE_CLIP_BOUNDS;
import static android.support.v4.view.ViewGroupCompat.LAYOUT_MODE_OPTICAL_BOUNDS;
import static com.facebook.sonar.plugins.inspector.InspectorValue.Type.Boolean;
import static com.facebook.sonar.plugins.inspector.InspectorValue.Type.Enum;

import android.os.Build;
import android.view.View;
import android.view.ViewGroup;
import com.facebook.sonar.R;
import com.facebook.sonar.core.SonarDynamic;
import com.facebook.sonar.core.SonarObject;
import com.facebook.sonar.plugins.inspector.HiddenNode;
import com.facebook.sonar.plugins.inspector.InspectorValue;
import com.facebook.sonar.plugins.inspector.Named;
import com.facebook.sonar.plugins.inspector.NodeDescriptor;
import com.facebook.sonar.plugins.inspector.Touch;
import com.facebook.stetho.common.android.FragmentCompatUtil;
import java.util.ArrayList;
import java.util.List;
import javax.annotation.Nullable;

public class ViewGroupDescriptor extends NodeDescriptor<ViewGroup> {

  private class NodeKey {
    private int[] mKey;

    boolean set(ViewGroup node) {
      final int childCount = node.getChildCount();
      final int[] key = new int[childCount];

      for (int i = 0; i < childCount; i++) {
        final View child = node.getChildAt(i);
        key[i] = System.identityHashCode(child);
      }

      boolean changed = false;
      if (mKey == null) {
        changed = true;
      } else if (mKey.length != key.length) {
        changed = true;
      } else {
        for (int i = 0; i < childCount; i++) {
          if (mKey[i] != key[i]) {
            changed = true;
            break;
          }
        }
      }

      mKey = key;
      return changed;
    }
  }

  @Override
  public void init(final ViewGroup node) {
    final NodeKey key = new NodeKey();

    final Runnable maybeInvalidate =
        new ErrorReportingRunnable() {
          @Override
          public void runOrThrow() throws Exception {
            if (connected()) {
              if (key.set(node)) {
                invalidate(node);
              }

              final boolean hasAttachedToWindow =
                  Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT;
              if (!hasAttachedToWindow || node.isAttachedToWindow()) {
                node.postDelayed(this, 1000);
              }
            }
          }
        };

    node.postDelayed(maybeInvalidate, 1000);
  }

  @Override
  public String getId(ViewGroup node) throws Exception {
    NodeDescriptor descriptor = descriptorForClass(View.class);
    return descriptor.getId(node);
  }

  @Override
  public String getName(ViewGroup node) throws Exception {
    NodeDescriptor descriptor = descriptorForClass(View.class);
    return descriptor.getName(node);
  }

  @Override
  public int getChildCount(ViewGroup node) {
    int childCount = 0;
    for (int i = 0, count = node.getChildCount(); i < count; i++) {
      if (!(node.getChildAt(i) instanceof HiddenNode)) {
        childCount++;
      }
    }
    return childCount;
  }

  @Override
  public @Nullable Object getChildAt(ViewGroup node, int index) {
    for (int i = 0, count = node.getChildCount(); i < count; i++) {
      final View child = node.getChildAt(i);
      if (child instanceof HiddenNode) {
        continue;
      }

      if (i >= index) {
        final Object fragment = getAttachedFragmentForView(child);
        if (fragment != null && !FragmentCompatUtil.isDialogFragment(fragment)) {
          return fragment;
        }

        return child;
      }
    }
    return null;
  }

  @Override
  public List<Named<SonarObject>> getData(ViewGroup node) throws Exception {
    final List<Named<SonarObject>> props = new ArrayList<>();
    final NodeDescriptor descriptor = descriptorForClass(View.class);

    final SonarObject.Builder vgProps = new SonarObject.Builder();

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR2) {
      vgProps
          .put(
              "layoutMode",
              InspectorValue.mutable(
                  Enum,
                  node.getLayoutMode() == LAYOUT_MODE_CLIP_BOUNDS
                      ? "LAYOUT_MODE_CLIP_BOUNDS"
                      : "LAYOUT_MODE_OPTICAL_BOUNDS"))
          .put("clipChildren", InspectorValue.mutable(Boolean, node.getClipChildren()));
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      vgProps.put("clipToPadding", InspectorValue.mutable(Boolean, node.getClipToPadding()));
    }

    props.add(0, new Named<>("ViewGroup", vgProps.build()));

    props.addAll(descriptor.getData(node));

    return props;
  }

  @Override
  public void setValue(ViewGroup node, String[] path, SonarDynamic value) throws Exception {
    switch (path[0]) {
      case "ViewGroup":
        switch (path[1]) {
          case "layoutMode":
            switch (value.asString()) {
              case "LAYOUT_MODE_CLIP_BOUNDS":
                node.setLayoutMode(LAYOUT_MODE_CLIP_BOUNDS);
                break;
              case "LAYOUT_MODE_OPTICAL_BOUNDS":
                node.setLayoutMode(LAYOUT_MODE_OPTICAL_BOUNDS);
                break;
              default:
                node.setLayoutMode(-1);
                break;
            }
            break;
          case "clipChildren":
            node.setClipChildren(value.asBoolean());
            break;
          case "clipToPadding":
            node.setClipToPadding(value.asBoolean());
            break;
        }
        break;
      default:
        final NodeDescriptor descriptor = descriptorForClass(View.class);
        descriptor.setValue(node, path, value);
        break;
    }
    invalidate(node);
  }

  @Override
  public List<Named<String>> getAttributes(ViewGroup node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(View.class);
    return descriptor.getAttributes(node);
  }

  @Override
  public void setHighlighted(ViewGroup node, boolean selected) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(View.class);
    descriptor.setHighlighted(node, selected);
  }

  @Override
  public void hitTest(ViewGroup node, Touch touch) {
    for (int i = node.getChildCount() - 1; i >= 0; i--) {
      final View child = node.getChildAt(i);
      if (child instanceof HiddenNode
          || child.getVisibility() != View.VISIBLE
          || shouldSkip(child)) {
        continue;
      }

      final int scrollX = node.getScrollX();
      final int scrollY = node.getScrollY();

      final int left = (child.getLeft() + (int) child.getTranslationX()) - scrollX;
      final int top = (child.getTop() + (int) child.getTranslationY()) - scrollY;
      final int right = (child.getRight() + (int) child.getTranslationX()) - scrollX;
      final int bottom = (child.getBottom() + (int) child.getTranslationY()) - scrollY;

      final boolean hit = touch.containedIn(left, top, right, bottom);

      if (hit) {
        touch.continueWithOffset(i, left, top);
        return;
      }
    }

    touch.finish();
  }

  private static boolean shouldSkip(View view) {
    Object tag = view.getTag(R.id.sonar_skip_view_traversal);
    if (!(tag instanceof Boolean)) {
      return false;
    }

    return (Boolean) tag;
  }

  @Override
  public @Nullable String getDecoration(ViewGroup obj) {
    return null;
  }

  @Override
  public boolean matches(String query, ViewGroup node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(Object.class);
    return descriptor.matches(query, node);
  }

  private static Object getAttachedFragmentForView(View v) {
    try {
      final Object fragment = FragmentCompatUtil.findFragmentForView(v);
      boolean added = false;
      if (fragment instanceof android.app.Fragment) {
        added = ((android.app.Fragment) fragment).isAdded();
      } else if (fragment instanceof android.support.v4.app.Fragment) {
        added = ((android.support.v4.app.Fragment) fragment).isAdded();
      }

      return added ? fragment : null;
    } catch (RuntimeException e) {
      return null;
    }
  }
}
