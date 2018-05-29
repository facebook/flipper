// Copyright 2004-present Facebook. All Rights Reserved.

package com.facebook.litho.sonar;

import android.graphics.Rect;
import android.view.ViewGroup;
import com.facebook.litho.DebugComponent;
import com.facebook.litho.LithoView;
import com.facebook.sonar.core.SonarDynamic;
import com.facebook.sonar.core.SonarObject;
import com.facebook.sonar.plugins.inspector.Named;
import com.facebook.sonar.plugins.inspector.NodeDescriptor;
import com.facebook.sonar.plugins.inspector.Touch;
import java.util.ArrayList;
import java.util.List;

public class LithoViewDescriptor extends NodeDescriptor<LithoView> {

  @Override
  public void init(LithoView node) throws Exception {
    node.setOnDirtyMountListener(
        new LithoView.OnDirtyMountListener() {
          @Override
          public void onDirtyMount(LithoView view) {
            invalidate(view);
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
  public int getChildCount(LithoView node) {
    return DebugComponent.getRootInstance(node) == null ? 0 : 1;
  }

  @Override
  public Object getChildAt(LithoView node, int index) {
    return DebugComponent.getRootInstance(node);
  }

  @Override
  public List<Named<SonarObject>> getData(LithoView node) throws Exception {
    final List<Named<SonarObject>> props = new ArrayList<>();
    final NodeDescriptor descriptor = descriptorForClass(ViewGroup.class);
    final Rect mountedBounds = node.getPreviousMountBounds();

    props.add(
        0,
        new Named<>(
            "LithoView",
            new SonarObject.Builder()
                .put(
                    "mountbounds",
                    new SonarObject.Builder()
                        .put("left", mountedBounds.left)
                        .put("top", mountedBounds.top)
                        .put("right", mountedBounds.right)
                        .put("bottom", mountedBounds.bottom))
                .build()));

    props.addAll(descriptor.getData(node));

    return props;
  }

  @Override
  public void setValue(LithoView node, String[] path, SonarDynamic value) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(ViewGroup.class);
    descriptor.setValue(node, path, value);
  }

  @Override
  public List<Named<String>> getAttributes(LithoView node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(ViewGroup.class);
    return descriptor.getAttributes(node);
  }

  @Override
  public void setHighlighted(LithoView node, boolean selected) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(ViewGroup.class);
    descriptor.setHighlighted(node, selected);
  }

  @Override
  public void hitTest(LithoView node, Touch touch) {
    touch.continueWithOffset(0, 0, 0);
  }

  @Override
  public String getDecoration(LithoView node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(ViewGroup.class);
    return descriptor.getDecoration(node);
  }

  @Override
  public boolean matches(String query, LithoView node) throws Exception {
    NodeDescriptor descriptor = descriptorForClass(Object.class);
    return descriptor.matches(query, node);
  }
}
