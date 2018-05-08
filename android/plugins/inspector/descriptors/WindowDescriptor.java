/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

package com.facebook.sonar.plugins.inspector.descriptors;

import android.view.View;
import android.view.Window;
import com.facebook.sonar.core.SonarDynamic;
import com.facebook.sonar.core.SonarObject;
import com.facebook.sonar.plugins.inspector.Named;
import com.facebook.sonar.plugins.inspector.NodeDescriptor;
import com.facebook.sonar.plugins.inspector.Touch;
import java.util.Collections;
import java.util.List;
import javax.annotation.Nullable;

public class WindowDescriptor extends NodeDescriptor<Window> {

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
  public List<Named<SonarObject>> getData(Window node) {
    return Collections.EMPTY_LIST;
  }

  @Override
  public void setValue(Window node, String[] path, SonarDynamic value) {}

  @Override
  public List<Named<String>> getAttributes(Window node) {
    return Collections.EMPTY_LIST;
  }

  @Override
  public void setHighlighted(Window node, boolean selected) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(View.class);
    descriptor.setHighlighted(node.getDecorView(), selected);
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
