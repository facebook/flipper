/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.flipper.plugins.uidebugger.util

import android.text.TextUtils
import android.view.View
import android.view.ViewGroup
import android.widget.AdapterView
import android.widget.HorizontalScrollView
import android.widget.ScrollView
import android.widget.Spinner
import androidx.core.view.ViewCompat
import androidx.core.view.accessibility.AccessibilityNodeInfoCompat

/**
 * This class provides utility methods for determining certain accessibility properties of [View]s
 * and [AccessibilityNodeInfoCompat]s. It is porting some of the checks from
 * [com.googlecode.eyesfree.utils.AccessibilityNodeInfoUtils], but has stripped many features which
 * are unnecessary here.
 */
object AccessibilityUtil {
  /**
   * Returns whether the specified node has text or a content description.
   *
   * @param node The node to check.
   * @return `true` if the node has text.
   */
  fun hasText(node: AccessibilityNodeInfoCompat?): Boolean {
    return if (node == null) {
      false
    } else !TextUtils.isEmpty(node.text) || !TextUtils.isEmpty(node.contentDescription)
  }

  /**
   * Returns whether the supplied [View] and [AccessibilityNodeInfoCompat] would produce spoken
   * feedback if it were accessibility focused. NOTE: not all speaking nodes are focusable.
   *
   * @param view The [View] to evaluate
   * @param node The [AccessibilityNodeInfoCompat] to evaluate
   * @return `true` if it meets the criterion for producing spoken feedback
   */
  private fun isSpeakingNode(node: AccessibilityNodeInfoCompat?, view: View?): Boolean {
    if (node == null || view == null) {
      return false
    }
    if (!node.isVisibleToUser) {
      return false
    }
    val important = ViewCompat.getImportantForAccessibility(view)
    return if (important == ViewCompat.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS ||
        important == ViewCompat.IMPORTANT_FOR_ACCESSIBILITY_NO && node.childCount <= 0) {
      false
    } else node.isCheckable || hasText(node) || hasNonActionableSpeakingDescendants(node, view)
  }

  /**
   * Determines if the supplied [View] and [AccessibilityNodeInfoCompat] has any children which are
   * not independently accessibility focusable and also have a spoken description.
   *
   * NOTE: Accessibility services will include these children's descriptions in the closest
   * focusable ancestor.
   *
   * @param view The [View] to evaluate
   * @param node The [AccessibilityNodeInfoCompat] to evaluate
   * @return `true` if it has any non-actionable speaking descendants within its subtree
   */
  private fun hasNonActionableSpeakingDescendants(
      node: AccessibilityNodeInfoCompat?,
      view: View?
  ): Boolean {
    if (node == null || view == null || view !is ViewGroup) {
      return false
    }
    val viewGroup = view as ViewGroup
    val count = viewGroup.childCount - 1
    for (i in 0..count) {
      val childView = viewGroup.getChildAt(i) ?: continue
      val childNode = AccessibilityNodeInfoCompat.obtain()
      try {
        ViewCompat.onInitializeAccessibilityNodeInfo(childView, childNode)
        if (isAccessibilityFocusable(childNode, childView)) {
          continue
        }
        if (isSpeakingNode(childNode, childView)) {
          return true
        }
      } finally {
        childNode.recycle()
      }
    }
    return false
  }

  /**
   * Determines if the provided [View] and [AccessibilityNodeInfoCompat] meet the criteria for
   * gaining accessibility focus.
   *
   * @param view The [View] to evaluate
   * @param node The [AccessibilityNodeInfoCompat] to evaluate
   * @return `true` if it is possible to gain accessibility focus
   */
  private fun isAccessibilityFocusable(node: AccessibilityNodeInfoCompat?, view: View?): Boolean {
    if (node == null || view == null) {
      return false
    }

    // Never focus invisible nodes.
    if (!node.isVisibleToUser) {
      return false
    }

    // Always focus "actionable" nodes.
    return if (isActionableForAccessibility(node)) {
      true
    } else isTopLevelScrollItem(node, view) && isSpeakingNode(node, view)
    // only focus top-level list items with non-actionable speaking children.
  }

  /**
   * Determines whether the provided [View] and [AccessibilityNodeInfoCompat] is a top-level item in
   * a scrollable container.
   *
   * @param view The [View] to evaluate
   * @param node The [AccessibilityNodeInfoCompat] to evaluate
   * @return `true` if it is a top-level item in a scrollable container.
   */
  fun isTopLevelScrollItem(node: AccessibilityNodeInfoCompat?, view: View?): Boolean {
    if (node == null || view == null) {
      return false
    }
    val parent = ViewCompat.getParentForAccessibility(view) as View? ?: return false
    if (node.isScrollable) {
      return true
    }
    val actionList: List<*> = node.actionList
    if (actionList.contains(AccessibilityNodeInfoCompat.ACTION_SCROLL_FORWARD) ||
        actionList.contains(AccessibilityNodeInfoCompat.ACTION_SCROLL_BACKWARD)) {
      return true
    }

    // AdapterView, ScrollView, and HorizontalScrollView are focusable
    // containers, but Spinner is a special case.
    return if (parent is Spinner) {
      false
    } else parent is AdapterView<*> || parent is ScrollView || parent is HorizontalScrollView
  }

  /**
   * Returns whether a node is actionable. That is, the node supports one of
   * [AccessibilityNodeInfoCompat.isClickable], [AccessibilityNodeInfoCompat.isFocusable], or
   * [AccessibilityNodeInfoCompat.isLongClickable].
   *
   * @param node The [AccessibilityNodeInfoCompat] to evaluate
   * @return `true` if node is actionable.
   */
  fun isActionableForAccessibility(node: AccessibilityNodeInfoCompat?): Boolean {
    if (node == null) {
      return false
    }
    if (node.isClickable || node.isLongClickable || node.isFocusable) {
      return true
    }
    val actionList: List<*> = node.actionList
    return actionList.contains(AccessibilityNodeInfoCompat.ACTION_CLICK) ||
        actionList.contains(AccessibilityNodeInfoCompat.ACTION_LONG_CLICK) ||
        actionList.contains(AccessibilityNodeInfoCompat.ACTION_FOCUS)
  }

  /**
   * Determines if any of the provided [View]'s and [AccessibilityNodeInfoCompat]'s ancestors can
   * receive accessibility focus
   *
   * @param view The [View] to evaluate
   * @param node The [AccessibilityNodeInfoCompat] to evaluate
   * @return `true` if an ancestor of may receive accessibility focus
   */
  fun hasFocusableAncestor(node: AccessibilityNodeInfoCompat?, view: View?): Boolean {
    if (node == null || view == null) {
      return false
    }
    val parentView = ViewCompat.getParentForAccessibility(view)
    if (parentView !is View) {
      return false
    }
    val parentNode = AccessibilityNodeInfoCompat.obtain()
    try {
      ViewCompat.onInitializeAccessibilityNodeInfo((parentView as View), parentNode)
      if (parentNode == null) {
        return false
      }
      if (isAccessibilityFocusable(parentNode, parentView as View)) {
        return true
      }
      if (hasFocusableAncestor(parentNode, parentView as View)) {
        return true
      }
    } finally {
      parentNode!!.recycle()
    }
    return false
  }
}
