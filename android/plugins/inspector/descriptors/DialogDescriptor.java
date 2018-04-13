/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

package com.facebook.sonar.plugins.inspector.descriptors;

import android.app.Dialog;
import android.view.Window;
import com.facebook.sonar.core.SonarDynamic;
import com.facebook.sonar.core.SonarObject;
import com.facebook.sonar.plugins.inspector.Named;
import com.facebook.sonar.plugins.inspector.NodeDescriptor;
import com.facebook.sonar.plugins.inspector.Touch;
import java.util.Collections;
import java.util.List;
import javax.annotation.Nullable;

public class DialogDescriptor extends NodeDescriptor<Dialog> {

  @Override
  public void init(Dialog node) {}

  @Override
  public String getId(Dialog node) {
    return Integer.toString(System.identityHashCode(node));
  }

  @Override
  public String getName(Dialog node) {
    return node.getClass().getSimpleName();
  }

  @Override
  public int getChildCount(Dialog node) {
    return node.getWindow() == null ? 0 : 1;
  }

  @Override
  public Object getChildAt(Dialog node, int index) {
    return node.getWindow();
  }

  @Override
  public List<Named<SonarObject>> getData(Dialog node) {
    return Collections.EMPTY_LIST;
  }

  @Override
  public void setValue(Dialog node, String[] path, SonarDynamic value) {}

  @Override
  public List<Named<String>> getAttributes(Dialog node) {
    return Collections.EMPTY_LIST;
  }

  @Override
  public void setHighlighted(Dialog node, boolean selected) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(Window.class);
    descriptor.setHighlighted(node.getWindow(), selected);
  }

  @Override
  public void hitTest(Dialog node, Touch touch) {
    touch.continueWithOffset(0, 0, 0);
  }

  @Override
  public @Nullable String getDecoration(Dialog obj) {
    return null;
  }

  @Override
  public boolean matches(String query, Dialog node) throws Exception {
    NodeDescriptor descriptor = descriptorForClass(Object.class);
    return descriptor.matches(query, node);
  }
}
