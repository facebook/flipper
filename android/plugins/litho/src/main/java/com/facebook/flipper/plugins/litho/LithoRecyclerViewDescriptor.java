/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.litho;

import android.view.View;
import android.view.ViewGroup;
import com.facebook.flipper.core.FlipperDynamic;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.plugins.inspector.Named;
import com.facebook.flipper.plugins.inspector.NodeDescriptor;
import com.facebook.flipper.plugins.inspector.SetDataOperations;
import com.facebook.flipper.plugins.inspector.Touch;
import com.facebook.litho.sections.debug.DebugSection;
import com.facebook.litho.widget.LithoRecylerView;
import java.util.ArrayList;
import java.util.List;
import javax.annotation.Nullable;

public class LithoRecyclerViewDescriptor extends NodeDescriptor<LithoRecylerView> {

  @Override
  public void invalidate(final LithoRecylerView node) {
    super.invalidate(node);

    new com.facebook.flipper.core.ErrorReportingRunnable(mConnection) {
      @Override
      protected void runOrThrow() throws Exception {
        final Object child;
        child = getChildAt(node, 0);
        if (child instanceof DebugSection) {
          DebugSection childSection = (DebugSection) child;
          final NodeDescriptor descriptor = descriptorForClass(DebugSection.class);
          descriptor.invalidate(childSection);
        }
      }
    }.run();
  }

  @Override
  public void init(final LithoRecylerView node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(ViewGroup.class);
    descriptor.init(node);
  }

  @Override
  public String getId(LithoRecylerView node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(ViewGroup.class);
    return descriptor.getId(node);
  }

  @Override
  public String getName(LithoRecylerView node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(ViewGroup.class);
    return descriptor.getName(node);
  }

  @Override
  public int getChildCount(LithoRecylerView node) throws Exception {
    // TODO T39526148 this might not always be true when using the RecyclerBinder manually.
    return 1;
  }

  @Override
  public int getAXChildCount(LithoRecylerView node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(ViewGroup.class);
    return descriptor.getAXChildCount(node);
  }

  @Override
  public Object getChildAt(LithoRecylerView node, int index) throws Exception {
    // TODO T39526148 account for the case above
    final NodeDescriptor descriptor = descriptorForClass(ViewGroup.class);
    int count = descriptor.getChildCount(node);

    final List<View> childrenViews = new ArrayList<>();
    for (int i = 0; i < count; i++) {
      childrenViews.add((View) descriptor.getChildAt(node, i));
    }

    return DebugSection.getRootInstance(childrenViews);
  }

  @Override
  public Object getAXChildAt(LithoRecylerView node, int index) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(ViewGroup.class);
    return descriptor.getAXChildAt(node, index);
  }

  @Override
  public List<Named<FlipperObject>> getData(LithoRecylerView node) throws Exception {
    final List<Named<FlipperObject>> props = new ArrayList<>();
    final NodeDescriptor descriptor = descriptorForClass(ViewGroup.class);
    props.addAll(descriptor.getData(node));

    return props;
  }

  @Override
  public List<Named<FlipperObject>> getAXData(LithoRecylerView node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(ViewGroup.class);
    return descriptor.getAXData(node);
  }

  @Override
  public void setValue(
      LithoRecylerView node,
      String[] path,
      @Nullable SetDataOperations.FlipperValueHint kind,
      FlipperDynamic value)
      throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(ViewGroup.class);
    descriptor.setValue(node, path, kind, value);
  }

  @Override
  public List<Named<String>> getAttributes(LithoRecylerView node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(ViewGroup.class);
    return descriptor.getAttributes(node);
  }

  @Override
  public FlipperObject getExtraInfo(LithoRecylerView node) {
    final NodeDescriptor descriptor = descriptorForClass(ViewGroup.class);
    return descriptor.getExtraInfo(node);
  }

  @Override
  public void hitTest(LithoRecylerView node, Touch touch) throws Exception {
    touch.continueWithOffset(0, 0, 0);
  }

  @Override
  public void axHitTest(LithoRecylerView node, Touch touch) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(ViewGroup.class);
    descriptor.axHitTest(node, touch);
  }

  @Override
  public String getAXName(LithoRecylerView node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(ViewGroup.class);
    return descriptor.getAXName(node);
  }

  @Override
  public List<Named<String>> getAXAttributes(LithoRecylerView node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(ViewGroup.class);
    return descriptor.getAXAttributes(node);
  }

  @Override
  public void setHighlighted(LithoRecylerView node, boolean selected, boolean isAlignmentMode)
      throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(ViewGroup.class);
    descriptor.setHighlighted(node, selected, isAlignmentMode);
  }

  @Override
  public String getDecoration(LithoRecylerView node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(ViewGroup.class);
    return descriptor.getDecoration(node);
  }

  @Override
  public String getAXDecoration(LithoRecylerView node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(ViewGroup.class);
    return descriptor.getAXDecoration(node);
  }

  @Override
  public boolean matches(String query, LithoRecylerView node) throws Exception {
    NodeDescriptor descriptor = descriptorForClass(Object.class);
    return descriptor.matches(query, node);
  }
}
