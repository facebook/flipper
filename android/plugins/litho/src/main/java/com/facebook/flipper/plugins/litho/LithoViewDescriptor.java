/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.litho;

import android.graphics.Rect;
import android.view.ViewGroup;
import com.facebook.flipper.core.FlipperDynamic;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.plugins.inspector.Named;
import com.facebook.flipper.plugins.inspector.NodeDescriptor;
import com.facebook.flipper.plugins.inspector.SetDataOperations;
import com.facebook.flipper.plugins.inspector.Touch;
import com.facebook.litho.DebugComponent;
import com.facebook.litho.LithoView;
import java.util.ArrayList;
import java.util.List;
import javax.annotation.Nullable;

public class LithoViewDescriptor extends NodeDescriptor<LithoView> {

  @Override
  public void init(LithoView node) throws Exception {
    node.setOnDirtyMountListener(
        new LithoView.OnDirtyMountListener() {
          @Override
          public void onDirtyMount(LithoView view) {
            invalidate(view);
            invalidateAX(view);
          }
        });
  }

  @Override
  public String getId(LithoView node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(ViewGroup.class);
    return descriptor.getId(node);
  }

  @Override
  public String getName(LithoView node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(ViewGroup.class);
    return descriptor.getName(node);
  }

  @Override
  public String getAXName(LithoView node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(ViewGroup.class);
    return descriptor.getAXName(node);
  }

  @Override
  public int getChildCount(LithoView node) {
    return DebugComponent.getRootInstance(node) == null ? 0 : 1;
  }

  @Override
  public int getAXChildCount(LithoView node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(ViewGroup.class);
    return descriptor.getAXChildCount(node);
  }

  @Override
  public Object getChildAt(LithoView node, int index) {
    return DebugComponent.getRootInstance(node);
  }

  @Override
  public @Nullable Object getAXChildAt(LithoView node, int index) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(ViewGroup.class);
    return descriptor.getChildAt(node, index);
  }

  @Override
  public List<Named<FlipperObject>> getData(LithoView node) throws Exception {
    final List<Named<FlipperObject>> props = new ArrayList<>();
    final NodeDescriptor descriptor = descriptorForClass(ViewGroup.class);
    final Rect mountedBounds = node.getPreviousMountBounds();

    props.add(
        0,
        new Named<>(
            "LithoView",
            new FlipperObject.Builder()
                .put(
                    "mountbounds",
                    new FlipperObject.Builder()
                        .put("left", mountedBounds.left)
                        .put("top", mountedBounds.top)
                        .put("right", mountedBounds.right)
                        .put("bottom", mountedBounds.bottom))
                .build()));

    props.addAll(descriptor.getData(node));

    return props;
  }

  @Override
  public List<Named<FlipperObject>> getAXData(LithoView node) throws Exception {
    final List<Named<FlipperObject>> props = new ArrayList<>();
    final NodeDescriptor descriptor = descriptorForClass(ViewGroup.class);
    props.addAll(descriptor.getAXData(node));
    return props;
  }

  @Override
  public void setValue(
      LithoView node,
      String[] path,
      @Nullable SetDataOperations.FlipperValueHint kind,
      FlipperDynamic value)
      throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(ViewGroup.class);
    descriptor.setValue(node, path, kind, value);
  }

  @Override
  public List<Named<String>> getAttributes(LithoView node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(ViewGroup.class);
    return descriptor.getAttributes(node);
  }

  @Override
  public List<Named<String>> getAXAttributes(LithoView node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(ViewGroup.class);
    return descriptor.getAXAttributes(node);
  }

  @Override
  public FlipperObject getExtraInfo(LithoView node) {
    final NodeDescriptor descriptor = descriptorForClass(ViewGroup.class);
    return descriptor.getExtraInfo(node);
  }

  @Override
  public void setHighlighted(LithoView node, boolean selected, boolean isAlignmentMode)
      throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(ViewGroup.class);
    descriptor.setHighlighted(node, selected, isAlignmentMode);
  }

  @Override
  public void hitTest(LithoView node, Touch touch) {
    touch.continueWithOffset(0, 0, 0);
  }

  @Override
  public void axHitTest(LithoView node, Touch touch) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(ViewGroup.class);
    descriptor.axHitTest(node, touch);
  }

  @Override
  public String getDecoration(LithoView node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(ViewGroup.class);
    return descriptor.getDecoration(node);
  }

  @Override
  public String getAXDecoration(LithoView node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(ViewGroup.class);
    return descriptor.getAXDecoration(node);
  }

  @Override
  public boolean matches(String query, LithoView node) throws Exception {
    NodeDescriptor descriptor = descriptorForClass(Object.class);
    return descriptor.matches(query, node);
  }
}
