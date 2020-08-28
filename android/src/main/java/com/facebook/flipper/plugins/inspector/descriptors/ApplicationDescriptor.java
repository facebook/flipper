/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.inspector.descriptors;

import android.app.Activity;
import android.view.View;
import android.view.ViewGroup;
import android.view.accessibility.AccessibilityEvent;
import androidx.core.view.ViewCompat;
import com.facebook.flipper.core.ErrorReportingRunnable;
import com.facebook.flipper.core.FlipperDynamic;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.plugins.inspector.ApplicationWrapper;
import com.facebook.flipper.plugins.inspector.Named;
import com.facebook.flipper.plugins.inspector.NodeDescriptor;
import com.facebook.flipper.plugins.inspector.SetDataOperations;
import com.facebook.flipper.plugins.inspector.Touch;
import com.facebook.flipper.plugins.inspector.descriptors.utils.ContextDescriptorUtils;
import java.util.ArrayList;
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

  private static final List<ViewGroup> editedDelegates = new ArrayList<>();
  private static boolean searchActive;

  public static void setSearchActive(boolean active) {
    searchActive = active;
  }

  public static boolean getSearchActive() {
    return searchActive;
  }

  private void setDelegates(ApplicationWrapper node) {
    clearEditedDelegates();

    for (View view : node.getViewRoots()) {
      // unlikely, but check to make sure accessibility functionality doesn't change
      boolean hasDelegateAlready = ViewCompat.hasAccessibilityDelegate(view);
      if (view instanceof ViewGroup && !hasDelegateAlready) {

        // add delegate to root to catch accessibility events so we can update focus in Flipper
        view.setAccessibilityDelegate(
            new View.AccessibilityDelegate() {
              @Override
              public boolean onRequestSendAccessibilityEvent(
                  ViewGroup host, View child, AccessibilityEvent event) {
                if (mConnection != null) {

                  // the touchOverlay will handle the event in this case
                  if (searchActive) {
                    return false;
                  }

                  // otherwise send the necessary focus event to the plugin
                  int eventType = event.getEventType();
                  if (eventType == AccessibilityEvent.TYPE_VIEW_ACCESSIBILITY_FOCUSED) {
                    mConnection.send(
                        "axFocusEvent", new FlipperObject.Builder().put("isFocus", true).build());
                  } else if (eventType
                      == AccessibilityEvent.TYPE_VIEW_ACCESSIBILITY_FOCUS_CLEARED) {
                    mConnection.send(
                        "axFocusEvent", new FlipperObject.Builder().put("isFocus", false).build());
                  } else if (eventType == AccessibilityEvent.TYPE_VIEW_CLICKED) {
                    mConnection.send(
                        "axFocusEvent",
                        new FlipperObject.Builder()
                            .put("isFocus", false)
                            .put("isClick", true)
                            .build());
                  }
                }
                return super.onRequestSendAccessibilityEvent(host, child, event);
              }
            });
        editedDelegates.add((ViewGroup) view);
      } else if (hasDelegateAlready && mConnection != null) {
        FlipperObject params =
            new FlipperObject.Builder()
                .put("type", "usage")
                .put("eventName", "accessibility:hasDelegateAlready")
                .build();
        mConnection.send("track", params);
      }
    }
  }

  public static void clearEditedDelegates() {
    for (ViewGroup viewGroup : editedDelegates) {
      viewGroup.setAccessibilityDelegate(null);
    }
    editedDelegates.clear();
  }

  @Override
  public void init(final ApplicationWrapper node) {
    node.setListener(
        new ApplicationWrapper.ActivityStackChangedListener() {
          @Override
          public void onActivityStackChanged(List<Activity> stack) {
            invalidate(node);
            invalidateAX(node);
            setDelegates(node);
          }
        });

    final NodeKey key = new NodeKey();

    if (mConnection != null) {
      final Runnable maybeInvalidate =
          new ErrorReportingRunnable(mConnection) {
            @Override
            public void runOrThrow() {
              if (connected()) {
                if (key.set(node)) {
                  invalidate(node);
                  invalidateAX(node);
                  setDelegates(node);
                }
                node.postDelayed(this, 1000);
              }
            }
          };

      node.postDelayed(maybeInvalidate, 1000);
    }
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
  public String getAXName(ApplicationWrapper node) {
    return "Application";
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
  public Object getAXChildAt(ApplicationWrapper node, int index) {
    return node.getViewRoots().get(index);
  }

  @Override
  public List<Named<FlipperObject>> getData(ApplicationWrapper node) {
    return Collections.singletonList(
        new Named<>("Theme", ContextDescriptorUtils.themeData(node.getApplication())));
  }

  @Override
  public void setValue(
      ApplicationWrapper node,
      String[] path,
      @Nullable SetDataOperations.FlipperValueHint kind,
      FlipperDynamic value) {}

  @Override
  public List<Named<String>> getAttributes(ApplicationWrapper node) {
    return Collections.EMPTY_LIST;
  }

  @Override
  public FlipperObject getExtraInfo(ApplicationWrapper node) {
    // Application node is it's own linkedNode because it shows up in both the ax and non-ax tree
    return new FlipperObject.Builder().put("linkedNode", getId(node)).build();
  }

  @Override
  public void setHighlighted(ApplicationWrapper node, boolean selected, boolean isAlignmentMode)
      throws Exception {
    final int childCount = getChildCount(node);
    if (childCount > 0) {
      final Object topChild = getChildAt(node, childCount - 1);
      final NodeDescriptor descriptor = descriptorForClass(topChild.getClass());
      if (descriptor != null) {
        descriptor.setHighlighted(topChild, selected, isAlignmentMode);
      }
    }
  }

  private void runHitTest(ApplicationWrapper node, Touch touch, boolean ax) {
    final int childCount = getChildCount(node);

    for (int i = childCount - 1; i >= 0; i--) {
      final Object child = ax ? getAXChildAt(node, i) : getChildAt(node, i);
      if (child instanceof Activity || child instanceof ViewGroup) {
        touch.continueWithOffset(i, 0, 0);
        return;
      }
    }

    touch.finish();
  }

  @Override
  public void hitTest(ApplicationWrapper node, Touch touch) throws Exception {
    runHitTest(node, touch, false);
  }

  @Override
  public void axHitTest(ApplicationWrapper node, Touch touch) throws Exception {
    runHitTest(node, touch, true);
  }

  @Nullable
  @Override
  public String getDecoration(ApplicationWrapper obj) {
    return null;
  }

  @Override
  public boolean matches(String query, ApplicationWrapper node) throws Exception {
    NodeDescriptor descriptor = descriptorForClass(Object.class);
    return descriptor.matches(query, node);
  }
}
