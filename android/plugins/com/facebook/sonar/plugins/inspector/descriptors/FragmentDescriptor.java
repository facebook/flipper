/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

package com.facebook.sonar.plugins.inspector.descriptors;

import android.app.Fragment;
import android.os.Bundle;
import android.view.View;
import com.facebook.sonar.core.SonarDynamic;
import com.facebook.sonar.core.SonarObject;
import com.facebook.sonar.plugins.inspector.Named;
import com.facebook.sonar.plugins.inspector.NodeDescriptor;
import com.facebook.sonar.plugins.inspector.Touch;
import com.facebook.stetho.common.android.ResourcesUtil;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import javax.annotation.Nullable;

public class FragmentDescriptor extends NodeDescriptor<Fragment> {

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
  public Object getChildAt(Fragment node, int index) {
    return node.getView();
  }

  @Override
  public List<Named<SonarObject>> getData(Fragment node) {
    final Bundle args = node.getArguments();
    if (args == null || args.isEmpty()) {
      return Collections.EMPTY_LIST;
    }

    final SonarObject.Builder bundle = new SonarObject.Builder();

    for (String key : args.keySet()) {
      bundle.put(key, args.get(key));
    }

    return Arrays.asList(new Named<>("Arguments", bundle.build()));
  }

  @Override
  public void setValue(Fragment node, String[] path, SonarDynamic value) {}

  @Override
  public List<Named<String>> getAttributes(Fragment node) {
    final String resourceId = getResourceId(node);

    if (resourceId == null) {
      return Collections.EMPTY_LIST;
    }

    return Arrays.asList(new Named<>("id", resourceId));
  }

  @Nullable
  private static String getResourceId(Fragment node) {
    final int id = node.getId();

    if (id == View.NO_ID || node.getHost() == null) {
      return null;
    }

    return ResourcesUtil.getIdStringQuietly(node.getContext(), node.getResources(), id);
  }

  @Override
  public void setHighlighted(Fragment node, boolean selected) throws Exception {
    if (node.getView() == null) {
      return;
    }

    final NodeDescriptor descriptor = descriptorForClass(View.class);
    descriptor.setHighlighted(node.getView(), selected);
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
    final String resourceId = getResourceId(node);

    if (resourceId != null) {
      if (resourceId.toLowerCase().contains(query)) {
        return true;
      }
    }

    final NodeDescriptor objectDescriptor = descriptorForClass(Object.class);
    return objectDescriptor.matches(query, node);
  }
}
