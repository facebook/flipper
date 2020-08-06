/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.litho;

import android.graphics.Rect;
import android.view.View;
import android.view.ViewGroup;
import androidx.core.view.MarginLayoutParamsCompat;
import androidx.core.view.ViewCompat;
import com.facebook.flipper.core.ErrorReportingRunnable;
import com.facebook.flipper.core.FlipperDynamic;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.plugins.inspector.HighlightedOverlay;
import com.facebook.flipper.plugins.inspector.Named;
import com.facebook.flipper.plugins.inspector.NodeDescriptor;
import com.facebook.flipper.plugins.inspector.Touch;
import com.facebook.litho.sections.Section;
import com.facebook.litho.sections.debug.DebugSection;
import java.util.ArrayList;
import java.util.List;
import javax.annotation.Nullable;

public class DebugSectionDescriptor extends NodeDescriptor<DebugSection> {

  @Override
  public void invalidate(final DebugSection debugSection) {
    super.invalidate(debugSection);

    new ErrorReportingRunnable(mConnection) {
      @Override
      protected void runOrThrow() throws Exception {
        for (int i = 0; i < getChildCount(debugSection); i++) {
          Object child = getChildAt(debugSection, i);
          if (child instanceof DebugSection) {
            invalidate((DebugSection) child);
          }
        }
      }
    }.run();
  }

  @Override
  public void init(DebugSection node) throws Exception {}

  @Override
  public String getId(DebugSection node) throws Exception {
    return node.getGlobalKey();
  }

  @Override
  public String getName(DebugSection node) throws Exception {
    return node.getName();
  }

  @Override
  public int getChildCount(DebugSection node) throws Exception {
    return node.getSectionChildren().size();
  }

  @Override
  public Object getChildAt(DebugSection node, int index) throws Exception {
    return node.getSectionChildren().get(index);
  }

  @Override
  public List<Named<FlipperObject>> getData(DebugSection node) throws Exception {
    // TODO T39526148 add changeset info
    final List<Named<FlipperObject>> data = new ArrayList<>();

    final List<Named<FlipperObject>> propData = getPropData(node);
    if (propData != null) {
      data.addAll(propData);
    }

    final FlipperObject stateData = getStateData(node);
    if (stateData != null) {
      data.add(new Named<>("State", stateData));
    }

    return data;
  }

  private static @Nullable List<Named<FlipperObject>> getPropData(DebugSection node)
      throws Exception {
    final Section section = node.getSection();
    return DataUtils.getPropData(section);
  }

  private static @Nullable FlipperObject getStateData(DebugSection node) {
    return DataUtils.getStateData(node.getStateContainer());
  }

  @Override
  public void setValue(DebugSection node, String[] path, FlipperDynamic value) throws Exception {
    // TODO T39526148
  }

  @Override
  public List<Named<String>> getAttributes(DebugSection node) throws Exception {
    // TODO T39526148
    final List<Named<String>> attrs = new ArrayList<>();
    return attrs;
  }

  @Override
  public FlipperObject getExtraInfo(DebugSection node) {
    FlipperObject.Builder extraInfo = new FlipperObject.Builder();
    extraInfo.put("className", node.getSection().getClass().getName());
    return extraInfo.build();
  }

  @Override
  public void setHighlighted(DebugSection node, boolean selected, boolean isAlignmentMode)
      throws Exception {
    final int childCount = getChildCount(node);

    if (node.isDiffSectionSpec()) {
      for (int i = 0; i < childCount; i++) {
        final View view = (View) getChildAt(node, i);
        highlightChildView(view, selected, isAlignmentMode);
      }
    } else {
      for (int i = 0; i < childCount; i++) {
        final Object child = getChildAt(node, i);
        final NodeDescriptor descriptor = descriptorForClass(child.getClass());
        descriptor.setHighlighted(child, selected, isAlignmentMode);
      }
    }
  }

  // This is similar to the implementation in ViewDescriptor but doesn't
  // target the parent view.
  private void highlightChildView(View node, boolean selected, boolean isAlignmentMode) {
    if (!selected) {
      HighlightedOverlay.removeHighlight(node);
      return;
    }

    final Rect padding =
        new Rect(
            ViewCompat.getPaddingStart(node),
            node.getPaddingTop(),
            ViewCompat.getPaddingEnd(node),
            node.getPaddingBottom());

    final Rect margin;
    final ViewGroup.LayoutParams params = node.getLayoutParams();
    if (params instanceof ViewGroup.MarginLayoutParams) {
      final ViewGroup.MarginLayoutParams marginParams = (ViewGroup.MarginLayoutParams) params;
      margin =
          new Rect(
              MarginLayoutParamsCompat.getMarginStart(marginParams),
              marginParams.topMargin,
              MarginLayoutParamsCompat.getMarginEnd(marginParams),
              marginParams.bottomMargin);
    } else {
      margin = new Rect();
    }

    final int left = node.getLeft();
    final int top = node.getTop();

    final Rect contentBounds = new Rect(left, top, left + node.getWidth(), top + node.getHeight());

    contentBounds.offset(-left, -top);

    HighlightedOverlay.setHighlighted(node, margin, padding, contentBounds, false);
  }

  @Override
  public void hitTest(DebugSection node, Touch touch) throws Exception {
    final int childCount = getChildCount(node);

    // For a DiffSectionSpec, check if child view to see if the touch is in its bounds.
    // For a GroupSectionSpec, check the bounds of the entire section.
    boolean finish = true;
    if (node.isDiffSectionSpec()) {
      for (int i = 0; i < childCount; i++) {
        View child = (View) getChildAt(node, i);
        int left = child.getLeft() + (int) child.getTranslationX();
        int top = (child.getTop() + (int) child.getTranslationY());
        int right = (child.getRight() + (int) child.getTranslationX());
        int bottom = (child.getBottom() + (int) child.getTranslationY());

        final boolean hit = touch.containedIn(left, top, right, bottom);
        if (hit) {
          touch.continueWithOffset(i, left, top);
          finish = false;
        }
      }
    } else {
      for (int i = 0; i < childCount; i++) {
        DebugSection child = (DebugSection) getChildAt(node, i);
        Rect bounds = child.getBounds();
        final boolean hit = touch.containedIn(bounds.left, bounds.top, bounds.right, bounds.bottom);
        if (hit) {
          touch.continueWithOffset(i, 0, 0);
          finish = false;
        }
      }
    }
    if (finish) touch.finish();
  }

  @Override
  public String getDecoration(DebugSection node) throws Exception {
    // TODO T39526148
    return null;
  }

  @Override
  public boolean matches(String query, DebugSection node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(Object.class);
    return descriptor.matches(query, node);
  }

  @Override
  public int getAXChildCount(DebugSection node) {
    return 0;
  }
}
