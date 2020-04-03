/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.inspector.descriptors;

import android.app.Activity;
import android.util.Log;
import android.view.Window;
import com.facebook.flipper.core.FlipperDynamic;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.plugins.inspector.Named;
import com.facebook.flipper.plugins.inspector.NodeDescriptor;
import com.facebook.flipper.plugins.inspector.Touch;
import com.facebook.flipper.plugins.inspector.descriptors.utils.ContextDescriptorUtils;
import com.facebook.flipper.plugins.inspector.descriptors.utils.stethocopies.FragmentActivityAccessor;
import com.facebook.flipper.plugins.inspector.descriptors.utils.stethocopies.FragmentCompat;
import com.facebook.flipper.plugins.inspector.descriptors.utils.stethocopies.FragmentManagerAccessor;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import javax.annotation.Nullable;

public class ActivityDescriptor extends NodeDescriptor<Activity> {

  private static final String TAG = "ActivityDescriptor";

  @Override
  public void init(Activity node) {}

  @Override
  public String getId(Activity node) {
    return Integer.toString(System.identityHashCode(node));
  }

  @Override
  public String getName(Activity node) {
    return node.getClass().getSimpleName();
  }

  @Override
  public int getChildCount(Activity node) {
    return (node.getWindow() != null ? 1 : 0)
        + getDialogFragments(FragmentCompat.getSupportLibInstance(), node).size()
        + getDialogFragments(FragmentCompat.getFrameworkInstance(), node).size();
  }

  @Override
  public Object getChildAt(Activity node, int index) {
    if (node.getWindow() != null) {
      if (index == 0) {
        return node.getWindow();
      } else {
        index--;
      }
    }

    final List dialogs = getDialogFragments(FragmentCompat.getSupportLibInstance(), node);
    if (index < dialogs.size()) {
      return dialogs.get(index);
    } else {
      final List supportDialogs = getDialogFragments(FragmentCompat.getFrameworkInstance(), node);
      return supportDialogs.get(index - dialogs.size());
    }
  }

  @Override
  public List<Named<FlipperObject>> getData(Activity node) {
    return Collections.singletonList(new Named<>("Theme", ContextDescriptorUtils.themeData(node)));
  }

  @Override
  public void setValue(Activity node, String[] path, FlipperDynamic value) throws Exception {}

  @Override
  public List<Named<String>> getAttributes(Activity node) {
    return Collections.EMPTY_LIST;
  }

  @Override
  public void setHighlighted(Activity node, boolean selected, boolean isAlignmentMode)
      throws Exception {
    final NodeDescriptor descriptor = descriptorForClass(Window.class);
    descriptor.setHighlighted(node.getWindow(), selected, isAlignmentMode);
  }

  @Override
  public void hitTest(Activity node, Touch touch) {
    touch.continueWithOffset(0, 0, 0);
  }

  @Override
  public @Nullable String getDecoration(Activity obj) {
    return null;
  }

  @Override
  public boolean matches(String query, Activity node) throws Exception {
    NodeDescriptor descriptor = descriptorForClass(Object.class);
    return descriptor.matches(query, node);
  }

  private static List<Object> getDialogFragments(FragmentCompat compat, Activity activity) {
    if (compat == null || !compat.getFragmentActivityClass().isInstance(activity)) {
      return Collections.EMPTY_LIST;
    }

    FragmentActivityAccessor activityAccessor = compat.forFragmentActivity();
    Object fragmentManager = activityAccessor.getFragmentManager(activity);
    if (fragmentManager == null) {
      return Collections.EMPTY_LIST;
    }

    FragmentManagerAccessor fragmentManagerAccessor = compat.forFragmentManager();
    List<Object> addedFragments = null;
    try {
      addedFragments = fragmentManagerAccessor.getAddedFragments(fragmentManager);
    } catch (Exception e) {
      Log.e(TAG, "Failed to obtain list of fragments.", e);
    }
    if (addedFragments == null) {
      return Collections.emptyList();
    }

    final List<Object> dialogFragments = new ArrayList<>();
    for (int i = 0, N = addedFragments.size(); i < N; ++i) {
      final Object fragment = addedFragments.get(i);
      if (compat.getDialogFragmentClass().isInstance(fragment)) {
        dialogFragments.add(fragment);
      }
    }

    return dialogFragments;
  }
}
