/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * <p>This source code is licensed under the MIT license found in the LICENSE file in the root
 * directory of this source tree.
 */
package com.facebook.flipper.plugins.litho;

import com.facebook.flipper.core.FlipperDynamic;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.plugins.inspector.Named;
import com.facebook.flipper.plugins.inspector.NodeDescriptor;
import com.facebook.flipper.plugins.inspector.Touch;
import com.facebook.litho.sections.debug.DebugSection;
import java.util.List;

public class DebugSectionDescriptor extends NodeDescriptor<DebugSection> {
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
    return null;
  }

  @Override
  public void setValue(DebugSection node, String[] path, FlipperDynamic value) throws Exception {
    // TODO T39526148
  }

  @Override
  public List<Named<String>> getAttributes(DebugSection node) throws Exception {
    // TODO T39526148
    return null;
  }

  @Override
  public void setHighlighted(DebugSection node, boolean selected, boolean isAlignmentMode)
      throws Exception {
    // TODO T39526148
  }

  @Override
  public void hitTest(DebugSection node, Touch touch) throws Exception {
    // TODO T39526148
  }

  @Override
  public String getDecoration(DebugSection node) throws Exception {
    // TODO T39526148
    return null;
  }

  @Override
  public boolean matches(String query, DebugSection node) throws Exception {
    // TODO T39526148
    return false;
  }

  @Override
  public int getAXChildCount(DebugSection node) {
    return 0;
  }
}
