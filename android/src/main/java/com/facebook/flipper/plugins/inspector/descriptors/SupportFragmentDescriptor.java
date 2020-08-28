/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.inspector.descriptors;

import android.os.Bundle;
import android.view.View;
import androidx.fragment.app.Fragment;
import com.facebook.flipper.core.FlipperDynamic;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.plugins.inspector.Named;
import com.facebook.flipper.plugins.inspector.NodeDescriptor;
import com.facebook.flipper.plugins.inspector.SetDataOperations;
import com.facebook.flipper.plugins.inspector.Touch;
import com.facebook.flipper.plugins.inspector.descriptors.utils.stethocopies.ResourcesUtil;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import javax.annotation.Nullable;

public class SupportFragmentDescriptor extends NodeDescriptor<Fragment> {

  @Override
  public void init(Fragment node) {}

  @Override
  public String getId(Fragment node) {
    return Integer.toString(System.identityHashCode(node));
  }

  @Override
  public String getName(Fragment node) {
    return node.getClass().getSimpleName();
  }

  @Override
  public int getChildCount(Fragment node) {
    return node.getView() == null ? 0 : 1;
  }

  @Override
  public @Nullable Object getChildAt(Fragment node, int index) {
    return node.getView();
  }

  @Override
  public List<Named<FlipperObject>> getData(Fragment node) {
    final Bundle args = node.getArguments();
    if (args == null || args.isEmpty()) {
      return Collections.EMPTY_LIST;
    }

    final FlipperObject.Builder bundle = new FlipperObject.Builder();

    for (String key : args.keySet()) {
      bundle.put(key, args.get(key));
    }

    return Arrays.asList(new Named<>("Arguments", bundle.build()));
  }

  @Override
  public void setValue(
      Fragment node,
      String[] path,
      @Nullable SetDataOperations.FlipperValueHint kind,
      FlipperDynamic value) {}

  @Override
  public List<Named<String>> getAttributes(Fragment node) {
    final int id = node.getId();
    if (id == View.NO_ID || node.getHost() == null) {
      return Collections.EMPTY_LIST;
    }

    return Arrays.asList(
        new Named<>(
            "id", ResourcesUtil.getIdStringQuietly(node.getContext(), node.getResources(), id)));
  }

  @Override
  public FlipperObject getExtraInfo(Fragment node) {
    return new FlipperObject.Builder().put("nonAXWithAXChild", true).build();
  }

  @Override
  public void setHighlighted(Fragment node, boolean selected, boolean isAlignmentMode)
      throws Exception {
    if (node.getView() == null) {
      return;
    }

    final NodeDescriptor descriptor = descriptorForClass(View.class);
    descriptor.setHighlighted(node.getView(), selected, isAlignmentMode);
  }

  @Override
  public void hitTest(Fragment node, Touch touch) {
    touch.continueWithOffset(0, 0, 0);
  }

  @Override
  public @Nullable String getDecoration(Fragment obj) {
    return null;
  }

  @Override
  public boolean matches(String query, Fragment node) throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(Object.class);
    return descriptor.matches(query, node);
  }
}
