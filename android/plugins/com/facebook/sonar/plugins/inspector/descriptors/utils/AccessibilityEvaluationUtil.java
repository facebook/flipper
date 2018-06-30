/*
 *  Copyright (c) 2018-present, Facebook, Inc.
 *
 *  This source code is licensed under the MIT license found in the LICENSE
 *  file in the root directory of this source tree.
 *
 */
package com.facebook.sonar.plugins.inspector.descriptors.utils;

import android.graphics.Rect;
import android.support.v4.view.ViewCompat;
import android.support.v4.view.accessibility.AccessibilityNodeInfoCompat;
import android.text.TextUtils;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewParent;
import com.facebook.sonar.plugins.inspector.descriptors.utils.AccessibilityRoleUtil.AccessibilityRole;
import java.util.List;
import javax.annotation.Nullable;

/**
 * This class provides utility methods for determining certain accessibility properties of {@link
 * View}s and {@link AccessibilityNodeInfoCompat}s. It is porting some of the checks from {@link
 * com.googlecode.eyesfree.utils.AccessibilityNodeInfoUtils}, but has stripped many features which
 * are unnecessary here.
 */
public class AccessibilityEvaluationUtil {

  private AccessibilityEvaluationUtil() {}

  /**
   * Returns whether the specified node has text or a content description.
   *
   * @param node The node to check.
   * @return {@code true} if the node has text.
   */
  public static boolean hasText(@Nullable AccessibilityNodeInfoCompat node) {
    return node != null
        && node.getCollectionInfo() == null
        && (!TextUtils.isEmpty(node.getText()) || !TextUtils.isEmpty(node.getContentDescription()));
  }

  /**
   * Returns whether the supplied {@link View} and {@link AccessibilityNodeInfoCompat} would produce
   * spoken feedback if it were accessibility focused. NOTE: not all speaking nodes are focusable.
   *
   * @param view The {@link View} to evaluate
   * @param node The {@link AccessibilityNodeInfoCompat} to evaluate
   * @return {@code true} if it meets the criterion for producing spoken feedback
   */
  public static boolean isSpeakingNode(
      @Nullable AccessibilityNodeInfoCompat node, @Nullable View view) {
    if (node == null || view == null) {
      return false;
    }

    final int important = ViewCompat.getImportantForAccessibility(view);
    if (important == ViewCompat.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS
        || (important == ViewCompat.IMPORTANT_FOR_ACCESSIBILITY_NO && node.getChildCount() <= 0)) {
      return false;
    }

    return node.isCheckable() || hasText(node) || hasNonActionableSpeakingDescendants(node, view);
  }

  /**
   * Determines if the supplied {@link View} and {@link AccessibilityNodeInfoCompat} has any
   * children which are not independently accessibility focusable and also have a spoken
   * description.
   *
   * <p>NOTE: Accessibility services will include these children's descriptions in the closest
   * focusable ancestor.
   *
   * @param view The {@link View} to evaluate
   * @param node The {@link AccessibilityNodeInfoCompat} to evaluate
   * @return {@code true} if it has any non-actionable speaking descendants within its subtree
   */
  public static boolean hasNonActionableSpeakingDescendants(
      @Nullable AccessibilityNodeInfoCompat node, @Nullable View view) {

    if (node == null || view == null || !(view instanceof ViewGroup)) {
      return false;
    }

    final ViewGroup viewGroup = (ViewGroup) view;
    for (int i = 0, count = viewGroup.getChildCount(); i < count; i++) {
      final View childView = viewGroup.getChildAt(i);

      if (childView == null) {
        continue;
      }

      final AccessibilityNodeInfoCompat childNode = AccessibilityNodeInfoCompat.obtain();
      try {
        ViewCompat.onInitializeAccessibilityNodeInfo(childView, childNode);

        if (!node.isVisibleToUser()) {
          continue;
        }

        if (isAccessibilityFocusable(childNode, childView)) {
          continue;
        }

        if (isSpeakingNode(childNode, childView)) {
          return true;
        }
      } finally {
        if (childNode != null) {
          childNode.recycle();
        }
      }
    }

    return false;
  }

  /**
   * Determines if the provided {@link View} and {@link AccessibilityNodeInfoCompat} meet the
   * criteria for gaining accessibility focus.
   *
   * <p>Note: this is evaluating general focusability by accessibility services, and does not mean
   * this view will be guaranteed to be focused by specific services such as Talkback. For Talkback
   * focusability, see {@link #isTalkbackFocusable(View)}
   *
   * @param view The {@link View} to evaluate
   * @param node The {@link AccessibilityNodeInfoCompat} to evaluate
   * @return {@code true} if it is possible to gain accessibility focus
   */
  public static boolean isAccessibilityFocusable(
      @Nullable AccessibilityNodeInfoCompat node, @Nullable View view) {
    if (node == null || view == null) {
      return false;
    }

    // Never focus invisible nodes.
    if (!node.isVisibleToUser()) {
      return false;
    }

    // Always focus "actionable" nodes.
    if (isActionableForAccessibility(node)) {
      return true;
    }

    // only focus top-level list items with non-actionable speaking children.
    return isTopLevelScrollItem(node, view) && isSpeakingNode(node, view);
  }

  /**
   * Determines whether the provided {@link View} and {@link AccessibilityNodeInfoCompat} is a
   * top-level item in a scrollable container.
   *
   * @param view The {@link View} to evaluate
   * @param node The {@link AccessibilityNodeInfoCompat} to evaluate
   * @return {@code true} if it is a top-level item in a scrollable container.
   */
  public static boolean isTopLevelScrollItem(
      @Nullable AccessibilityNodeInfoCompat node, @Nullable View view) {
    if (node == null || view == null) {
      return false;
    }

    final View parent = (View) ViewCompat.getParentForAccessibility(view);
    if (parent == null) {
      return false;
    }

    if (node.isScrollable()) {
      return true;
    }

    final List actionList = node.getActionList();
    if (actionList.contains(AccessibilityNodeInfoCompat.ACTION_SCROLL_FORWARD)
        || actionList.contains(AccessibilityNodeInfoCompat.ACTION_SCROLL_BACKWARD)) {
      return true;
    }

    // Top-level items in a scrolling pager are actually two levels down since the first
    // level items in pagers are the pages themselves.
    View grandparent = (View) ViewCompat.getParentForAccessibility(parent);
    if (grandparent != null
        && AccessibilityRoleUtil.getRole(grandparent) == AccessibilityRole.PAGER) {
      return true;
    }

    AccessibilityRole parentRole = AccessibilityRoleUtil.getRole(parent);
    return parentRole == AccessibilityRole.LIST
        || parentRole == AccessibilityRole.GRID
        || parentRole == AccessibilityRole.SCROLL_VIEW
        || parentRole == AccessibilityRole.HORIZONTAL_SCROLL_VIEW;
  }

  /**
   * Returns whether a node is actionable. That is, the node supports one of {@link
   * AccessibilityNodeInfoCompat#isClickable()}, {@link AccessibilityNodeInfoCompat#isFocusable()},
   * or {@link AccessibilityNodeInfoCompat#isLongClickable()}.
   *
   * @param node The {@link AccessibilityNodeInfoCompat} to evaluate
   * @return {@code true} if node is actionable.
   */
  public static boolean isActionableForAccessibility(@Nullable AccessibilityNodeInfoCompat node) {
    if (node == null) {
      return false;
    }

    if (node.isClickable() || node.isLongClickable() || node.isFocusable()) {
      return true;
    }

    final List actionList = node.getActionList();
    return actionList.contains(AccessibilityNodeInfoCompat.ACTION_CLICK)
        || actionList.contains(AccessibilityNodeInfoCompat.ACTION_LONG_CLICK)
        || actionList.contains(AccessibilityNodeInfoCompat.ACTION_FOCUS);
  }

  /**
   * Determines if any of the provided {@link View}'s and {@link AccessibilityNodeInfoCompat}'s
   * ancestors can receive accessibility focus
   *
   * @param view The {@link View} to evaluate
   * @param node The {@link AccessibilityNodeInfoCompat} to evaluate
   * @return {@code true} if an ancestor of may receive accessibility focus
   */
  public static boolean hasFocusableAncestor(
      @Nullable AccessibilityNodeInfoCompat node, @Nullable View view) {
    if (node == null || view == null) {
      return false;
    }

    final ViewParent parentView = ViewCompat.getParentForAccessibility(view);
    if (!(parentView instanceof View)) {
      return false;
    }

    final AccessibilityNodeInfoCompat parentNode = AccessibilityNodeInfoCompat.obtain();
    try {
      ViewCompat.onInitializeAccessibilityNodeInfo((View) parentView, parentNode);
      if (parentNode == null) {
        return false;
      }

      if (hasEqualBoundsToViewRoot(parentNode, (View) parentView)
          && parentNode.getChildCount() > 0) {
        return false;
      }

      if (isAccessibilityFocusable(parentNode, (View) parentView)) {
        return true;
      }

      if (hasFocusableAncestor(parentNode, (View) parentView)) {
        return true;
      }
    } finally {
      parentNode.recycle();
    }
    return false;
  }

  /**
   * Returns whether a one given view is a descendant of another.
   *
   * @param view The {@link View} to evaluate
   * @param potentialAncestor The potential ancestor {@link View}
   * @return {@code true} if view is a descendant of potentialAncestor
   */
  private static boolean viewIsDescendant(View view, View potentialAncestor) {
    ViewParent parent = view.getParent();
    while (parent != null) {
      if (parent == potentialAncestor) {
        return true;
      }
      parent = parent.getParent();
    }

    return false;
  }

  /**
   * Returns whether a View has the same size and position as its View Root.
   *
   * @param view The {@link View} to evaluate
   * @return {@code true} if view has equal bounds
   */
  public static boolean hasEqualBoundsToViewRoot(AccessibilityNodeInfoCompat node, View view) {
    AndroidRootResolver rootResolver = new AndroidRootResolver();
    List<AndroidRootResolver.Root> roots = rootResolver.listActiveRoots();
    if (roots != null) {
      for (AndroidRootResolver.Root root : roots) {
        if (view == root.view) {
          return true;
        }

        if (viewIsDescendant(view, root.view)) {
          Rect nodeBounds = new Rect();
          node.getBoundsInScreen(nodeBounds);

          Rect viewRootBounds = new Rect();
          viewRootBounds.set(
              root.param.x,
              root.param.y,
              root.param.width + root.param.x,
              root.param.height + root.param.y);

          return nodeBounds.equals(viewRootBounds);
        }
      }
    }
    return false;
  }

  /**
   * Returns whether a given {@link View} will be focusable by Google's TalkBack screen reader.
   *
   * @param view The {@link View} to evaluate.
   * @return {@code boolean} if the view will be ignored by TalkBack.
   */
  public static boolean isTalkbackFocusable(View view) {
    if (view == null) {
      return false;
    }

    final int important = ViewCompat.getImportantForAccessibility(view);
    if (important == ViewCompat.IMPORTANT_FOR_ACCESSIBILITY_NO
        || important == ViewCompat.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS) {
      return false;
    }

    // Go all the way up the tree to make sure no parent has hidden its descendants
    ViewParent parent = view.getParent();
    while (parent instanceof View) {
      if (ViewCompat.getImportantForAccessibility((View) parent)
          == ViewCompat.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS) {
        return false;
      }
      parent = parent.getParent();
    }

    final AccessibilityNodeInfoCompat node = ViewAccessibilityHelper.createNodeInfoFromView(view);
    if (node == null) {
      return false;
    }

    // Non-leaf nodes identical in size to their View Root should not be focusable.
    if (hasEqualBoundsToViewRoot(node, view) && node.getChildCount() > 0) {
      return false;
    }

    try {
      if (!node.isVisibleToUser()) {
        return false;
      }

      if (isAccessibilityFocusable(node, view)) {
        if (node.getChildCount() <= 0) {
          // Leaves that are accessibility focusable are never ignored, even if they don't have a
          // speakable description
          return true;
        } else if (isSpeakingNode(node, view)) {
          // Node is focusable and has something to speak
          return true;
        }

        // Node is focusable and has nothing to speak
        return false;
      }

      // if view is not accessibility focusable, it needs to have text and no focusable ancestors.
      if (!hasText(node)) {
        return false;
      }

      if (!hasFocusableAncestor(node, view)) {
        return true;
      }

      return false;
    } finally {
      node.recycle();
    }
  }
}
