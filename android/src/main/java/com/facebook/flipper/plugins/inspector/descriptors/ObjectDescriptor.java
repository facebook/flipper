/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.inspector.descriptors;

import com.facebook.flipper.core.FlipperDynamic;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.plugins.inspector.Named;
import com.facebook.flipper.plugins.inspector.NodeDescriptor;
import com.facebook.flipper.plugins.inspector.SetDataOperations;
import com.facebook.flipper.plugins.inspector.Touch;
import java.util.Collections;
import java.util.List;
import javax.annotation.Nullable;

public class ObjectDescriptor extends NodeDescriptor<Object> {

  @Override
  public void init(Object node) {}

  @Override
  public String getId(Object node) {
    return Integer.toString(System.identityHashCode(node));
  }

  @Override
  public String getName(Object node) {
    return node.getClass().getName();
  }

  @Override
  public int getChildCount(Object node) {
    return 0;
  }

  @Override
  public @Nullable Object getChildAt(Object node, int index) {
    return null;
  }

  @Override
  public List<Named<FlipperObject>> getData(Object node) {
    return Collections.EMPTY_LIST;
  }

  @Override
  public void setValue(
      Object node,
      String[] path,
      @Nullable SetDataOperations.FlipperValueHint kind,
      FlipperDynamic value) {}

  @Override
  public List<Named<String>> getAttributes(Object node) {
    return Collections.EMPTY_LIST;
  }

  @Override
  public void setHighlighted(Object node, boolean selected, boolean isAlignmentMode) {}

  @Override
  public void hitTest(Object node, Touch touch) {
    touch.finish();
  }

  @Override
  public @Nullable String getDecoration(Object obj) {
    return null;
  }

  @Override
  public boolean matches(String query, Object node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(node.getClass());
    final List<Named<String>> attributes =
        descriptor == null ? Collections.emptyList() : descriptor.getAttributes(node);
    for (Named<String> namedString : attributes) {
      if (namedString.getName().equals("id")) {
        if (namedString.getValue().toLowerCase().contains(query)) {
          return true;
        }
      }
    }

    return descriptor == null ? false : descriptor.getName(node).toLowerCase().contains(query);
  }
}
