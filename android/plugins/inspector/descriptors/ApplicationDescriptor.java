/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */

package com.facebook.sonar.plugins.inspector.descriptors;

import android.app.Activity;
import android.view.View;
import android.view.ViewGroup;
import com.facebook.sonar.core.SonarDynamic;
import com.facebook.sonar.core.SonarObject;
import com.facebook.sonar.plugins.inspector.ApplicationWrapper;
import com.facebook.sonar.plugins.inspector.Named;
import com.facebook.sonar.plugins.inspector.NodeDescriptor;
import com.facebook.sonar.plugins.inspector.Touch;
import java.util.Collections;
import java.util.List;
import javax.annotation.Nullable;

public class ApplicationDescriptor extends NodeDescriptor<ApplicationWrapper> {

  private class NodeKey {
    private int[] mKey;

    boolean set(ApplicationWrapper node) {
      final List<View> roots = node.getViewRoots();
      final int childCount = roots.size();
      final int[] key = new int[childCount];

      for (int i = 0; i < childCount; i++) {
        final View child = roots.get(i);
        key[i] = System.identityHashCode(child);
      }

      boolean changed = false;
      if (mKey == null) {
        changed = true;
      } else if (mKey.length != key.length) {
        changed = true;
      } else {
        for (int i = 0; i < childCount; i++) {
          if (mKey[i] != key[i]) {
            changed = true;
            break;
          }
        }
      }

      mKey = key;
      return changed;
    }
  }

  @Override
  public void init(final ApplicationWrapper node) {
    node.setListener(
        new ApplicationWrapper.ActivityStackChangedListener() {
          @Override
          public void onActivityStackChanged(List<Activity> stack) {
            invalidate(node);
          }
        });

    final NodeKey key = new NodeKey();
    final Runnable maybeInvalidate =
        new NodeDescriptor.ErrorReportingRunnable() {
          @Override
          public void runOrThrow() throws Exception {
            if (connected()) {
              if (key.set(node)) {
                invalidate(node);
              }
              node.postDelayed(this, 1000);
            }
          }
        };

    node.postDelayed(maybeInvalidate, 1000);
  }

  @Override
  public String getId(ApplicationWrapper node) {
    return node.getApplication().getPackageName();
  }

  @Override
  public String getName(ApplicationWrapper node) {
    return node.getApplication().getPackageName();
  }

  @Override
  public int getChildCount(ApplicationWrapper node) {
    return node.getViewRoots().size();
  }

  @Override
  public Object getChildAt(ApplicationWrapper node, int index) {
    final View view = node.getViewRoots().get(index);

    for (Activity activity : node.getActivityStack()) {
      if (activity.getWindow().getDecorView() == view) {
        return activity;
      }
    }

    return view;
  }

  @Override
  public List<Named<SonarObject>> getData(ApplicationWrapper node) {
    return Collections.EMPTY_LIST;
  }

  @Override
  public void setValue(ApplicationWrapper node, String[] path, SonarDynamic value) {}

  @Override
  public List<Named<String>> getAttributes(ApplicationWrapper node) {
    return Collections.EMPTY_LIST;
  }

  @Override
  public void setHighlighted(ApplicationWrapper node, boolean selected) throws Exception {
    final int childCount = getChildCount(node);
    if (childCount > 0) {
      final Object topChild = getChildAt(node, childCount - 1);
      final NodeDescriptor descriptor = descriptorForClass(topChild.getClass());
      descriptor.setHighlighted(topChild, selected);
    }
  }

  @Override
  public void hitTest(ApplicationWrapper node, Touch touch) {
    final int childCount = getChildCount(node);

    for (int i = childCount - 1; i >= 0; i--) {
      final Object child = getChildAt(node, i);
      if (child instanceof Activity || child instanceof ViewGroup) {
        touch.continueWithOffset(i, 0, 0);
        return;
      }
    }

    touch.finish();
  }

  @Override
  public @Nullable String getDecoration(ApplicationWrapper obj) {
    return null;
  }

  @Override
  public boolean matches(String query, ApplicationWrapper node) throws Exception {
    NodeDescriptor descriptor = descriptorForClass(Object.class);
    return descriptor.matches(query, node);
  }
}
